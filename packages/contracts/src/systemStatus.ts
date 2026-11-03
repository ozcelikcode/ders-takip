import { z } from 'zod';
import { languageSchema } from './language.js';

const count = z.number().int().min(0);
const bytes = z.number().int().min(0);
const instant = z.iso.datetime({ offset: true });

/**
 * What an administrator sees about the running site: server, database, activity, backups and delivery.
 * Read-only, and never a secret: paths and host names appear, passwords, keys and tokens never do.
 */
export const systemStatusSchema = z.object({
  generatedAt: instant,
  server: z.object({
    environment: z.enum(['development', 'test', 'production']),
    nodeVersion: z.string(),
    platform: z.string(),
    startedAt: instant,
    uptimeSeconds: count,
    memory: z.object({ rssBytes: bytes, heapUsedBytes: bytes, heapTotalBytes: bytes }),
    loadAverage: z.array(z.number().min(0)).length(3),
    cpuCount: count,
  }),
  database: z.object({
    path: z.string(),
    sqliteVersion: z.string(),
    journalMode: z.string(),
    sizeBytes: bytes,
    walBytes: bytes,
    freeBytes: bytes,
    migrations: z.object({ applied: count, required: count, latest: z.string().nullable() }),
    // Bytes per table need SQLite's dbstat table, which some builds leave out.
    tables: z.array(z.object({ name: z.string(), rows: count, bytes: bytes.nullable() })),
  }),
  activity: z.object({
    users: count,
    activeUsers: count,
    administrators: count,
    signedInLastDay: count,
    newUsersLastWeek: count,
    openSignIns: count,
    runningSessions: count,
    sessionsLastDay: count,
    pushSubscriptions: count,
    calendarFeeds: count,
  }),
  backups: z.object({
    directory: z.string(),
    copyDirectory: z.string().nullable(),
    count,
    totalBytes: bytes,
    latest: z.object({ createdAt: instant, type: z.enum(['auto', 'manual']), verified: z.boolean() }).nullable(),
    intervalDays: z.number().int().positive(),
  }),
  configuration: z.object({
    frontendUrl: z.string(),
    trustProxy: count,
    language: languageSchema,
    maintenanceMode: z.boolean(),
    allowRegistration: z.boolean(),
    auditLogPath: z.string(),
    auditLogBytes: bytes,
    email: z.object({ enabled: z.boolean(), host: z.string().nullable(), port: z.number().int().nullable() }),
    push: z.object({ enabled: z.boolean() }),
  }),
});
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export const systemStatusResponseSchema = z.object({ success: z.literal(true), data: systemStatusSchema });
