import path from 'node:path';
import { Sequelize } from 'sequelize';
import { backendDirectory, getEnvironment } from './environment';

const environment = getEnvironment();
export const databasePath = environment.DB_PATH === ':memory:'
  ? ':memory:'
  : path.resolve(backendDirectory, environment.DB_PATH);
export const backupDirectory = path.resolve(backendDirectory, environment.BACKUP_DIR);

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
