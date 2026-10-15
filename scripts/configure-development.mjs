import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const content = [
  'NODE_ENV=development',
  'PORT=5002',
  `JWT_SECRET=${randomBytes(48).toString('hex')}`,
  'JWT_EXPIRE=15m',
  'SESSION_TTL_DAYS=7',
  'FRONTEND_URL=http://localhost:3000',
  'DB_PATH=database.sqlite',
  'BACKUP_DIR=backups',
  '',
].join('\n');

try {
  writeFileSync(new URL('../backend/.env', import.meta.url), content, { flag: 'wx', mode: 0o600 });
  console.log('Created local backend configuration with a random signing secret.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing backend configuration was preserved.');
}
