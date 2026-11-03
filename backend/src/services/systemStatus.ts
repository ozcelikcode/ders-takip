import { stat } from 'node:fs/promises';
import os from 'node:os';
import { systemStatusSchema, type SystemStatus } from '@study-tracker/contracts';
import { Op, QueryTypes } from 'sequelize';
import { getEnvironment } from '../config/environment';
import { auditLogPath, backupCopyDirectory, backupDirectory, databasePath, sequelize } from '../config/database';
import { requiredMigrations } from '../database/migrations';
import { AuthSession, CalendarFeed, PushSubscription, StudySession, User } from '../models';
import { listBackups } from './backups';
import { mailer } from './mailer';
import { pushSender } from './pushSender';
import { readSiteSettings } from './siteSettings';

const startedAt = new Date(Date.now() - process.uptime() * 1000);
const day = 24 * 60 * 60 * 1000;

const fileSize = async (file: string): Promise<number> => {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
};
const select = <T extends object>(sql: string) => sequelize.query<T>(sql, { type: QueryTypes.SELECT });
const pragma = async (name: string): Promise<number | string> => Object.values((await select<Record<string, number | string>>(`PRAGMA ${name}`))[0] ?? {})[0] ?? 0;

/** Row counts for every table, and bytes per table (with its indexes) where this SQLite build has the dbstat table. */
async function tableSizes() {
  const tables = await select<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  let bytes: Map<string, number> | null = null;
  try {
    const rows = await select<{ name: string; bytes: number }>(
      'SELECT m.tbl_name AS name, SUM(s.pgsize) AS bytes FROM dbstat s JOIN sqlite_master m ON m.name = s.name GROUP BY m.tbl_name',
    );
    bytes = new Map(rows.map((row) => [row.name, Number(row.bytes)]));
  } catch {
    // dbstat is optional; sizes are then unknown, never guessed.
  }
  return Promise.all(tables.map(async ({ name }) => {
    // Names come from sqlite_master itself; quoting still keeps any odd name a single identifier.
    const [row] = await select<{ total: number }>(`SELECT COUNT(*) AS total FROM "${name.replace(/"/g, '""')}"`);
    return { name, rows: Number(row?.total ?? 0), bytes: bytes ? (bytes.get(name) ?? 0) : null };
  }));
}

/** A read-only picture of the running site for administrators; contains paths and host names, never secrets. */
export async function readSystemStatus(now = new Date()): Promise<SystemStatus> {
  const environment = getEnvironment();
  const settings = await readSiteSettings();
  const [tables, pageSize, freePages, journalMode, sqliteVersion, applied, backups] = await Promise.all([
    tableSizes(),
    pragma('page_size'),
    pragma('freelist_count'),
    pragma('journal_mode'),
    select<{ version: string }>('SELECT sqlite_version() AS version').then((rows) => rows[0]?.version ?? ''),
    select<{ name: string }>('SELECT name FROM schema_migrations ORDER BY name'),
    listBackups(),
  ]);
  const since = (milliseconds: number) => new Date(now.getTime() - milliseconds);
  const [users, activeUsers, administrators, signedInLastDay, newUsersLastWeek, openSignIns, runningSessions, sessionsLastDay, pushSubscriptions, calendarFeeds] = await Promise.all([
    User.count(),
    User.count({ where: { isActive: true } }),
    User.count({ where: { role: 'admin', isActive: true } }),
    User.count({ where: { lastLogin: { [Op.gte]: since(day) } } }),
    User.count({ where: { createdAt: { [Op.gte]: since(7 * day) } } }),
    AuthSession.count({ where: { revokedAt: null, expiresAt: { [Op.gt]: now } } }),
    StudySession.count({ where: { status: 'in_progress' } }),
    StudySession.count({ where: { status: { [Op.ne]: 'cancelled' }, startTime: { [Op.gte]: since(day), [Op.lte]: now } } }),
    PushSubscription.count(),
    CalendarFeed.count(),
  ]);
  const memory = process.memoryUsage();
  const latest = backups[0];
  return systemStatusSchema.parse({
    generatedAt: now.toISOString(),
    server: {
      environment: environment.NODE_ENV,
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${process.arch})`,
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: { rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
      loadAverage: os.loadavg().map((value) => Math.round(value * 100) / 100),
      cpuCount: os.availableParallelism(),
    },
    database: {
      path: databasePath,
      sqliteVersion,
      journalMode: String(journalMode),
      sizeBytes: databasePath === ':memory:' ? 0 : await fileSize(databasePath),
      walBytes: databasePath === ':memory:' ? 0 : await fileSize(`${databasePath}-wal`),
      freeBytes: Number(freePages) * Number(pageSize),
      migrations: { applied: applied.length, required: requiredMigrations.length, latest: applied[applied.length - 1]?.name ?? null },
      tables,
    },
    activity: { users, activeUsers, administrators, signedInLastDay, newUsersLastWeek, openSignIns, runningSessions, sessionsLastDay, pushSubscriptions, calendarFeeds },
    backups: {
      directory: backupDirectory,
      copyDirectory: backupCopyDirectory,
      count: backups.length,
      totalBytes: backups.reduce((sum, backup) => sum + backup.size, 0),
      latest: latest ? { createdAt: latest.createdAt, type: latest.type, verified: latest.verified } : null,
      intervalDays: Number(settings.backup_interval),
    },
    configuration: {
      frontendUrl: environment.FRONTEND_URL,
      trustProxy: environment.TRUST_PROXY,
      language: settings.language,
      maintenanceMode: settings.maintenanceMode,
      allowRegistration: settings.allowRegistration,
      auditLogPath,
      auditLogBytes: await fileSize(auditLogPath),
      email: { enabled: mailer.enabled(), host: environment.SMTP_HOST ?? null, port: environment.SMTP_HOST ? environment.SMTP_PORT : null },
      push: { enabled: pushSender.enabled() },
    },
  });
}
