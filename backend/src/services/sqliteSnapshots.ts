import sqlite3 from 'sqlite3';
import fs from 'node:fs/promises';
import type { Database } from 'sqlite3';
import { sequelize } from '../config/database';
import { requiredMigrations } from '../database/migrations';

interface BackupHandle {
  step(pages: number, callback: (error: Error | null) => void): void;
  finish(callback: (error: Error | null) => void): void;
}
interface BackupDatabase extends Database {
  backup(filename: string, destination: string, source: string, filenameIsDestination: boolean, callback: (error: Error | null) => void): BackupHandle;
}
const open = (filename: string, flags: number): Promise<BackupDatabase> => new Promise((resolve, reject) => {
  const database = new sqlite3.Database(filename, flags, error => error ? reject(error) : resolve(database as BackupDatabase));
});
const close = (database: Database) => new Promise<void>((resolve, reject) => database.close(error => error ? reject(error) : resolve()));
const query = <T>(database: Database, sql: string): Promise<T[]> => new Promise((resolve, reject) => database.all<T>(sql, (error, rows) => error ? reject(error) : resolve(rows)));

export const validateSnapshot = async (filename: string): Promise<void> => {
  const database = await open(filename, sqlite3.OPEN_READONLY);
  try {
    const integrity = await query<{ integrity_check: string }>(database, 'PRAGMA integrity_check');
    if (integrity.length !== 1 || integrity[0]?.integrity_check !== 'ok') throw new Error('Snapshot integrity check failed');
    const foreignKeys = await query(database, 'PRAGMA foreign_key_check');
    if (foreignKeys.length) throw new Error('Snapshot foreign key check failed');
    const migrations = await query<{ name: string }>(database, 'SELECT name FROM schema_migrations');
    if (requiredMigrations.some(name => !migrations.some(row => row.name === name))) throw new Error('Snapshot schema is incompatible');
    for (const model of Object.values(sequelize.models)) {
      const table = sequelize.getQueryInterface().quoteIdentifier(String(model.getTableName()));
      const columns = await query<{ name: string }>(database, `PRAGMA table_info(${table})`);
      const expected = Object.entries(model.getAttributes()).map(([name, attribute]) => attribute.field || name);
      if (expected.some(name => !columns.some(column => column.name === name))) throw new Error('Snapshot columns are incompatible');
    }
  } finally { await close(database); }
};

// SQLite commits the destination backup as one transaction, including existing WAL databases.
export const copySqliteSnapshot = async (liveFilename: string, snapshotFilename: string, restore = false): Promise<void> => {
  const database = await open(liveFilename, restore ? sqlite3.OPEN_READWRITE : sqlite3.OPEN_READONLY);
  try {
    await new Promise<void>((resolve, reject) => {
      const backup = database.backup(snapshotFilename, 'main', 'main', !restore, error => {
        if (error) { reject(error); return; }
        backup.step(-1, stepError => backup.finish(finishError => stepError || finishError ? reject(stepError || finishError) : resolve()));
      });
    });
  } finally { await close(database); }
  if (!restore) await fs.chmod(snapshotFilename, 0o600);
};
