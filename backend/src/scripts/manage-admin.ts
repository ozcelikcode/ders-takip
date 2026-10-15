import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { databasePath, sequelize } from '../config/database';
import { assertDatabaseReady } from '../database/migrations';
import { manageAdminAccount } from '../services/adminAccounts';

const run = async () => {
  const { values } = parseArgs({ options: { mode: { type: 'string' }, email: { type: 'string' }, username: { type: 'string', default: 'admin' }, 'password-file': { type: 'string' } } });
  if ((values.mode !== 'create' && values.mode !== 'recover') || !values.email || !values['password-file']) throw new Error('Usage: npm run admin:manage -- --mode create|recover --email EMAIL --username USERNAME --password-file PRIVATE_FILE');
  await fs.access(databasePath); // Refuse to create a missing database as a side effect of recovery.
  const file = await fs.open(values['password-file'], 'r');
  let password: string;
  try {
    const info = await file.stat();
    if (!info.isFile() || (info.mode & 0o077) !== 0 || info.size > 512) throw new Error('Password file must be a private regular file (0600)');
    password = (await file.readFile('utf8')).trimEnd();
  } finally { await file.close(); }
  await assertDatabaseReady();
  await manageAdminAccount(values.mode, values.email, values.username, password);
  console.log(`Administrator ${values.mode === 'create' ? 'created' : 'recovered'}; password was not logged.`);
};
void run().catch(error => { console.error(error instanceof Error ? error.message : 'Administrator operation failed'); process.exitCode = 1; }).finally(() => sequelize.close());
