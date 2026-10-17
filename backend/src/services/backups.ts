import { backupRecordSchema } from '@study-tracker/contracts';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Transaction } from 'sequelize';
import type { Response } from 'express';
import { backupDirectory, databasePath, sequelize } from '../config/database';
import { AuthSession, Backup, Category, Course, Plan, Settings, StudySession, Topic, User } from '../models';
import { assertDatabaseReady } from '../database/migrations';
import { keepDatabaseUnavailable, withDatabaseMaintenance } from './databaseMaintenance';
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
export const performBackup = (type: 'auto' | 'manual', response?: Response) => withDatabaseMaintenance(() => createSnapshot(type), response);

export const restoreSnapshot = (id: number, response?: Response): Promise<void> => withDatabaseMaintenance(async () => {
  const entry = await Backup.findByPk(id);
  if (!entry) throw new Error('Backup not found');
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

export const resetApplicationData = (mode: 'settings_only' | 'all', response?: Response) => withDatabaseMaintenance(async () => {
  const safety = await createSnapshot('manual');
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    if (mode === 'all') {
      await StudySession.destroy({ where: {}, transaction });
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

export const runScheduledBackup = (now = new Date()): Promise<boolean> => withDatabaseMaintenance(async () => {
  await purgeExpiredSessions();
  const setting = await Settings.findOne({ where: { key: 'backup_interval' } });
  const days = setting ? Number(setting.value) : 7;
  if (![1, 5, 7].includes(days)) throw new Error('Invalid backup interval');
  const latest = (await verifiedManifests()).filter(manifest => manifest.type === 'auto').sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))[0];
  if (!isBackupDue(latest ? new Date(latest.createdAt) : null, days, now)) return false;
  await createSnapshot('auto');
  return true;
});

export const listBackups = async () => {
  const manifests = await verifiedManifests();
  const verifiedIds = new Set(manifests.map(manifest => manifest.id));
  return (await Backup.findAll({ order: [['createdAt', 'DESC']] })).map(entry => backupRecordSchema.parse({ id: entry.id, filename: entry.filename, size: entry.size, type: entry.type, createdAt: entry.createdAt.toISOString(), verified: verifiedIds.has(entry.id) }));
};
