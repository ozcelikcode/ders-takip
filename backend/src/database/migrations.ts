import { Model, QueryTypes, type ModelStatic, type SyncOptions, type Transactionable } from 'sequelize';
import { sequelize } from '../config/database';
import { AuthSession, RefreshCredential } from '../models';

export const requiredMigrations = ['001-initial-schema', '002-auth-sessions'];
async function validateExistingTables() {
  const query = sequelize.getQueryInterface();
  const tables = await query.showAllTables();
  for (const model of Object.values(sequelize.models) as ModelStatic<Model>[]) {
    const table = model.getTableName();
    if (typeof table !== 'string' || !tables.includes(table)) continue;
    const columns = await query.describeTable(table);
    const missing = Object.entries(model.getAttributes()).filter(([name, attribute]) => !columns[attribute.field ?? name]).map(([name]) => name);
    if (missing.length) throw new Error(`Existing table ${table} requires a dedicated migration for: ${missing.join(', ')}`);
  }
}
export async function assertDatabaseReady(): Promise<void> {
  const tables = await sequelize.getQueryInterface().showAllTables();
  if (!tables.includes('schema_migrations')) throw new Error('Database schema is not initialized. Run npm run db:migrate.');
  const completed = await sequelize.query<{ name: string }>('SELECT name FROM schema_migrations', { type: QueryTypes.SELECT });
  if (requiredMigrations.some(name => !completed.some(row => row.name === name))) throw new Error('Database migrations are pending. Run npm run db:migrate.');
  await validateExistingTables();
  for (const model of Object.values(sequelize.models)) if (!tables.includes(String(model.getTableName()))) throw new Error('Database tables are missing. Restore or repair the database before startup.');
}
export async function applyMigrations(): Promise<void> {
  await validateExistingTables();
  await sequelize.transaction(async transaction => {
    await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY NOT NULL)', { transaction });
    const completed = await sequelize.query<{ name: string }>('SELECT name FROM schema_migrations', { type: QueryTypes.SELECT, transaction });
    for (const name of requiredMigrations) {
      if (completed.some(row => row.name === name)) continue;
      const options: SyncOptions & Transactionable = { transaction };
      if (name === '001-initial-schema') await sequelize.sync(options);
      else if (name === '002-auth-sessions') { await AuthSession.sync(options); await RefreshCredential.sync(options); }
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (:name)', { replacements: { name }, transaction });
    }
  });
  await assertDatabaseReady();
}
