import { sequelize } from '../config/database';
import { verifyBackupRestore } from '../services/backups';

// `npm run backup:verify [-- <backup id>]`: proves the newest (or chosen) backup can be restored, using a temporary
// copy only. The live database is never opened.
async function main() {
  const argument = process.argv[2];
  const id = argument === undefined ? undefined : Number(argument);
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) throw new Error('The backup id must be a positive whole number');
  try {
    const result = await verifyBackupRestore(id);
    console.log(`Backup #${result.id} (${result.type}, ${result.createdAt}, ${result.size} bytes) restores cleanly: checksum, integrity, foreign keys and schema are valid.`);
  } finally {
    await sequelize.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Backup verification failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
