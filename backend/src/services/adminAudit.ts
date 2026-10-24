import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';
import { adminAuditEntrySchema, type AdminAuditAction, type AdminAuditDetails, type AdminAuditEntry, type AdminAuditPage } from '@study-tracker/contracts';
import { auditLogPath } from '../config/database';

interface Person { id: number; username: string }
interface StoredEntry extends AdminAuditEntry { prev: string; hash: string }

const genesis = '0'.repeat(64);
export const person = (user: Person): Person => ({ id: user.id, username: user.username });
// The fields are listed explicitly so the hashed text has one fixed key order on write and on check.
const body = (entry: AdminAuditEntry): AdminAuditEntry => ({
  seq: entry.seq, at: entry.at, action: entry.action, actor: entry.actor, target: entry.target, details: entry.details, ip: entry.ip,
});
const digest = (prev: string, entry: AdminAuditEntry) => createHash('sha256').update(`${prev}\n${JSON.stringify(body(entry))}`).digest('hex');

async function readLines(): Promise<string[]> {
  try {
    return (await readFile(auditLogPath, 'utf8')).split('\n').filter(Boolean);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
const parse = (line: string): StoredEntry | null => {
  try {
    return JSON.parse(line) as StoredEntry;
  } catch {
    return null;
  }
};

let last: { seq: number; hash: string } | null = null;
let queue: Promise<unknown> = Promise.resolve();

/**
 * Appends one administrator action. Every entry carries the hash of the one before it, so editing, removing or
 * reordering earlier entries shows up as a broken chain. A failed write is reported on the console and never undoes
 * the action itself, which has already happened.
 */
export function recordAdminEvent(event: { action: AdminAuditAction; actor?: Person | null; target?: Person | null; details?: AdminAuditDetails; request?: Request }): Promise<void> {
  const write = queue.then(async () => {
    if (!last) {
      const lines = await readLines();
      const end = lines.length ? parse(lines[lines.length - 1]!) : null;
      last = end ? { seq: end.seq, hash: end.hash } : { seq: 0, hash: genesis };
    }
    const entry: AdminAuditEntry = {
      seq: last.seq + 1,
      at: new Date().toISOString(),
      action: event.action,
      actor: event.actor ? person(event.actor) : null,
      target: event.target ? person(event.target) : null,
      details: event.details ?? {},
      ip: event.request?.ip ?? null,
    };
    const hash = digest(last.hash, entry);
    await mkdir(path.dirname(auditLogPath), { recursive: true });
    await appendFile(auditLogPath, `${JSON.stringify({ ...entry, prev: last.hash, hash })}\n`, { mode: 0o600 });
    last = { seq: entry.seq, hash };
  });
  queue = write.catch(() => undefined);
  return write.catch((error: unknown) => {
    last = null;
    console.error('Admin audit write failed:', error instanceof Error ? error.message : error);
  });
}

/** A page of the log, newest first, with the result of checking the whole chain. */
export async function listAdminEvents(options: { before?: number | undefined; limit: number }): Promise<AdminAuditPage> {
  await queue;
  const lines = await readLines();
  let previous = genesis;
  let brokenAt: number | null = null;
  const entries: AdminAuditEntry[] = [];
  lines.forEach((line, index) => {
    const stored = parse(line);
    const position = index + 1;
    // An entry that no longer has the logged shape cannot be shown; it still counts as a break in the chain.
    const readable = stored ? adminAuditEntrySchema.safeParse(body(stored)) : null;
    if (!stored || !readable?.success || stored.seq !== position || stored.prev !== previous || stored.hash !== digest(previous, stored)) brokenAt ??= position;
    if (readable?.success) entries.push(readable.data);
    if (stored) previous = stored.hash;
  });
  const older = entries.filter((entry) => options.before === undefined || entry.seq < options.before).reverse();
  return {
    entries: older.slice(0, options.limit),
    hasMore: older.length > options.limit,
    integrity: { intact: brokenAt === null, brokenAt, total: lines.length },
  };
}
