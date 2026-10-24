import path from 'node:path';
import { Sequelize } from 'sequelize';
import { backendDirectory, getEnvironment } from './environment';

const environment = getEnvironment();
export const databasePath = environment.DB_PATH === ':memory:'
  ? ':memory:'
  : path.resolve(backendDirectory, environment.DB_PATH);
export const backupDirectory = path.resolve(backendDirectory, environment.BACKUP_DIR);
export const backupCopyDirectory = environment.BACKUP_COPY_DIR
  ? path.resolve(backendDirectory, environment.BACKUP_COPY_DIR)
  : null;
export const auditLogPath = environment.AUDIT_LOG_PATH
  ? path.resolve(backendDirectory, environment.AUDIT_LOG_PATH)
  : path.join(databasePath === ':memory:' ? backupDirectory : path.dirname(databasePath), 'admin-audit.jsonl');
// The copy is pruned like the primary folder, so sharing one folder would delete real snapshots.
if (backupCopyDirectory === backupDirectory) throw new Error('BACKUP_COPY_DIR must differ from BACKUP_DIR');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databasePath,
  logging: false,
  define: { timestamps: true, underscored: false, freezeTableName: true },
});

// Schema changes belong to the explicit migration command, never server startup.
export const connectDB = async (): Promise<void> => {
  await sequelize.authenticate();
};
