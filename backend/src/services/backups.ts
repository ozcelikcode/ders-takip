import { backupRecordSchema, fail } from '@study-tracker/contracts';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Transaction } from 'sequelize';
import type { Response } from 'express';
import { backupCopyDirectory, backupDirectory, databasePath, sequelize } from '../config/database';
import { AuthSession, Backup, Category, Course, CourseGoal, Plan, SessionSeries, Settings, StudySession, Tag, Topic, User } from '../models';
import { assertDatabaseReady } from '../database/migrations';
import { keepDatabaseUnavailable, withDatabaseActivity, withDatabaseMaintenance } from './databaseMaintenance';
import { purgeExpiredSessions } from './authSessions';
import { copySqliteSnapshot, validateSnapshot } from './sqliteSnapshots';

const manifestSchema = z.object({ id: z.number().int().positive(), filename: z.string().regex(/^backup-(auto|manual)-[a-f0-9-]+\.sqlite$/), size: z.number().int().positive(), checksum: z.string().regex(/^[a-f0-9]{64}$/), type: z.enum(['auto', 'manual']), createdAt: z.iso.datetime() });
type BackupManifest = z.infer<typeof manifestSchema>;
const checksum = async (filename: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
};
const syncFile = async (filename: string) => { const file = await fs.open(filename, 'r'); try { await file.sync(); } finally { await file.close(); } };
const persistManifest = async (filename: string, value: BackupManifest) => {
  const temporary = `${manifestPath(filename)}.partial`;
  const file = await fs.open(temporary, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(value)); await file.sync(); } finally { await file.close(); }
  await fs.rename(temporary, manifestPath(filename));
  await syncFile(backupDirectory);
};
const manifestPath = (filename: string) => path.join(backupDirectory, `${manifestSchema.shape.filename.parse(filename)}.json`);
const snapshotPath = (filename: string) => path.join(backupDirectory, manifestSchema.shape.filename.parse(filename));
const readManifest = async (filename: string) => {
  const manifest = manifestSchema.parse(JSON.parse(await fs.readFile(manifestPath(filename), 'utf8')));
  if (manifest.filename !== filename) throw new Error('Snapshot manifest filename mismatch');
  return manifest;
};
const verifiedManifests = async () => {
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const names = (await fs.readdir(backupDirectory)).filter(name => /^backup-(auto|manual)-[a-f0-9-]+\.sqlite\.json$/.test(name));
  const results = await Promise.allSettled(names.map(async name => {
    const manifest = await readManifest(name.slice(0, -5));
    if ((await fs.stat(snapshotPath(manifest.filename))).size !== manifest.size) throw new Error('Snapshot size mismatch');
    return manifest;
  }));
  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value];
    console.warn('Ignored invalid snapshot manifest:', names[index]);
    return [];
  });
};
export const reconcileBackupCatalog = async (): Promise<void> => {
  const manifests = await verifiedManifests();
  await sequelize.transaction(async transaction => {
    for (const manifest of manifests) await Backup.upsert({ id: manifest.id, filename: manifest.filename, path: snapshotPath(manifest.filename), size: manifest.size, type: manifest.type, createdAt: new Date(manifest.createdAt) }, { transaction });
  });
};
const createSnapshot = async (type: 'auto' | 'manual'): Promise<Backup> => {
  if (databasePath === ':memory:') throw new Error('File-backed SQLite is required for snapshots');
  await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  await reconcileBackupCatalog();
  const filename = `backup-${type}-${randomUUID()}.sqlite`;
  const destination = snapshotPath(filename);
  const temporary = `${destination}.partial`;
  let entry: Backup | undefined;
  try {
    await copySqliteSnapshot(databasePath, temporary);
    await validateSnapshot(temporary);
    const stats = await fs.stat(temporary);
    const digest = await checksum(temporary);
    await syncFile(temporary);
    await fs.rename(temporary, destination);
    entry = await Backup.create({ filename, path: destination, size: stats.size, type });
    const manifest: BackupManifest = { id: entry.id, filename, size: stats.size, checksum: digest, type, createdAt: entry.createdAt.toISOString() };
    await persistManifest(filename, manifest);
    return entry;
  } catch (error) {
    if (entry) await entry.destroy();
    await fs.rm(temporary, { force: true }); await fs.rm(destination, { force: true });
    await fs.rm(`${manifestPath(filename)}.partial`, { force: true }); await fs.rm(manifestPath(filename), { force: true });
    throw error;
  }
};
export const performBackup = async (type: 'auto' | 'manual', response?: Response) => {
  const entry = await withDatabaseMaintenance(() => createSnapshot(type), response);
  void mirrorBackups();
  return entry;
};

/** Automatic snapshots kept; manual snapshots, including the safety copies taken before a restore or reset, are never removed. */
export const automaticBackupsKept = 14;
const newestFirst = (first: BackupManifest, second: BackupManifest) => Date.parse(second.createdAt) - Date.parse(first.createdAt);
const removeSnapshot = async (manifest: BackupManifest) => {
  // Catalog row, then manifest, then data: an interrupted removal never brings a snapshot back.
  await Backup.destroy({ where: { id: manifest.id } });
  await fs.rm(manifestPath(manifest.filename), { force: true });
  await fs.rm(snapshotPath(manifest.filename), { force: true });
};
const pruneAutomaticBackups = async () => {
  const automatic = (await verifiedManifests()).filter(manifest => manifest.type === 'auto').sort(newestFirst);
  for (const manifest of automatic.slice(automaticBackupsKept)) await removeSnapshot(manifest);
};

const copyVerified = async (source: string, destination: string, expected?: string) => {
  const temporary = `${destination}.partial`;
  try {
    await fs.copyFile(source, temporary);
    await syncFile(temporary);
    if (expected && (await checksum(temporary)) !== expected) throw new Error(`Copied snapshot checksum mismatch: ${path.basename(destination)}`);
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true });
  }
};
let mirroring: Promise<void> = Promise.resolve();
/**
 * Brings BACKUP_COPY_DIR in line with the verified snapshots: copies new ones (data first, then
 * its manifest, each checked and renamed into place) and drops copies of pruned automatic ones.
 * Files there that are not snapshot copies are left alone. A failure is logged, never thrown,
 * and the next run catches up; runs are queued so two never write the same file.
 */
export const mirrorBackups = (): Promise<void> => {
  const target = backupCopyDirectory;
  if (!target) return Promise.resolve();
  mirroring = mirroring.then(async () => {
    await fs.mkdir(target, { recursive: true, mode: 0o700 });
    const manifests = await verifiedManifests();
    for (const manifest of manifests) {
      const copy = path.join(target, manifest.filename);
      const copied = await fs.stat(copy).then(stats => stats.size === manifest.size, () => false);
      const described = await fs.access(`${copy}.json`).then(() => true, () => false);
      if (copied && described) continue;
      await copyVerified(snapshotPath(manifest.filename), copy, manifest.checksum);
      await copyVerified(manifestPath(manifest.filename), `${copy}.json`);
    }
    const current = new Set(manifests.map(manifest => manifest.filename));
    for (const name of await fs.readdir(target)) {
      const match = /^(backup-auto-[a-f0-9-]+\.sqlite)(\.json)?$/.exec(name);
      if (match?.[1] && !current.has(match[1])) await fs.rm(path.join(target, name), { force: true });
    }
  }).catch(error => console.error('Backup copy failed:', error));
  return mirroring;
};

export const restoreSnapshot = async (id: number, response?: Response): Promise<void> => {
  await restoreFromSnapshot(id, response);
  void mirrorBackups();
};
const restoreFromSnapshot = (id: number, response?: Response): Promise<void> => withDatabaseMaintenance(async () => {
  const entry = await Backup.findByPk(id);
  if (!entry) fail(404, 'recordNotFound');
  const manifest = await readManifest(entry.filename);
  if (manifest.id !== id || manifest.filename !== entry.filename) throw new Error('Snapshot identity mismatch');
  const source = snapshotPath(manifest.filename);
  if ((await checksum(source)) !== manifest.checksum || (await fs.stat(source)).size !== manifest.size) throw new Error('Snapshot checksum mismatch');
  await validateSnapshot(source);
  const safety = await createSnapshot('manual');
  try {
    await copySqliteSnapshot(databasePath, source, true);
    await assertDatabaseReady();
    await reconcileBackupCatalog();
    // A restored snapshot must never revive previously issued credentials.
    await AuthSession.update({ revokedAt: new Date() }, { where: {} });
  } catch (error) {
    try {
      await copySqliteSnapshot(databasePath, safety.path, true);
      await assertDatabaseReady();
      await reconcileBackupCatalog();
    } catch {
      keepDatabaseUnavailable();
      throw new Error('Restore and recovery failed; database access remains disabled');
    }
    throw error;
  }
}, response);

export const resetApplicationData = async (mode: 'settings_only' | 'all', response?: Response) => {
  const result = await resetWithSafetyCopy(mode, response);
  void mirrorBackups();
  return result;
};
const resetWithSafetyCopy = (mode: 'settings_only' | 'all', response?: Response) => withDatabaseMaintenance(async () => {
  const safety = await createSnapshot('manual');
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    if (mode === 'all') {
      await StudySession.destroy({ where: {}, transaction });
      await SessionSeries.destroy({ where: {}, transaction });
      await CourseGoal.destroy({ where: {}, transaction });
      await Tag.destroy({ where: {}, transaction });
      await Plan.destroy({ where: {}, transaction });
      await Topic.destroy({ where: {}, transaction });
      await Course.destroy({ where: {}, transaction });
      await Category.destroy({ where: {}, transaction });
      await User.destroy({ where: { role: 'student' }, transaction });
    }
    // settings_only means settings only: account and study history remain untouched.
    await Settings.destroy({ where: {}, transaction });
  });
  return { safetyBackupId: safety.id };
}, response);

export const isBackupDue = (last: Date | null, days: number, now: Date) => !last || now.getTime() - last.getTime() >= days * 86400000;

const scheduledBackupDue = async (now: Date): Promise<boolean> => {
  const setting = await Settings.findOne({ where: { key: 'backup_interval' } });
  const days = setting ? Number(setting.value) : 7;
  if (![1, 5, 7].includes(days)) throw new Error('Invalid backup interval');
  const latest = (await verifiedManifests()).filter(manifest => manifest.type === 'auto').sort(newestFirst)[0];
  return isBackupDue(latest ? new Date(latest.createdAt) : null, days, now);
};

/**
 * The five-minute tick. Purging sessions and checking whether a backup is due are ordinary work; only an actual
 * snapshot takes the database out of service, so requests are not turned away every five minutes.
 */
export const runScheduledBackup = async (now = new Date()): Promise<boolean> => {
  await withDatabaseActivity(purgeExpiredSessions);
  if (!(await withDatabaseActivity(() => scheduledBackupDue(now)))) return false;
  const created = await withDatabaseMaintenance(async () => {
    // Checked again: a manual restore or backup may have finished in between.
    if (!(await scheduledBackupDue(now))) return false;
    await createSnapshot('auto');
    await pruneAutomaticBackups();
    return true;
  });
  if (created) await mirrorBackups();
  return created;
};

export const listBackups = async () => {
  const manifests = await verifiedManifests();
  const verifiedIds = new Set(manifests.map(manifest => manifest.id));
  return (await Backup.findAll({ order: [['createdAt', 'DESC']] })).map(entry => backupRecordSchema.parse({ id: entry.id, filename: entry.filename, size: entry.size, type: entry.type, createdAt: entry.createdAt.toISOString(), verified: verifiedIds.has(entry.id) }));
};
