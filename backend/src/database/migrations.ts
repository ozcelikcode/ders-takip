import { DataTypes, Model, QueryTypes, type ModelStatic, type SyncOptions, type Transactionable } from 'sequelize';
import { sequelize } from '../config/database';
import { migrateStoredPreferences } from './preferenceMigration';
import { AuthSession, RefreshCredential, SessionInterval, PomodoroClock, UserTopicProgress, PasswordResetToken, PushSubscription, NotificationDelivery, SessionSeries, CourseGoal, CalendarFeed, Tag, CourseTag, SessionTag } from '../models';

export const requiredMigrations = ['001-initial-schema', '002-auth-sessions', '003-user-preferences-v1', '004-session-activity-intervals', '005-pomodoro-clocks', '006-user-topic-progress', '007-password-reset-tokens', '008-personal-categories', '009-notifications', '010-session-series', '011-course-goals', '012-calendar-feeds', '013-tags', '014-notification-reads'];
const personalCategoriesMigration = '008-personal-categories';
// Columns that a still-pending migration adds itself, as `table.column`.
async function validateExistingTables(addedByPendingMigrations: readonly string[] = []) {
  const query = sequelize.getQueryInterface();
  const tables = await query.showAllTables();
  for (const model of Object.values(sequelize.models) as ModelStatic<Model>[]) {
    const table = model.getTableName();
    if (typeof table !== 'string' || !tables.includes(table)) continue;
    const columns = await query.describeTable(table);
    const missing = Object.entries(model.getAttributes()).filter(([name, attribute]) => !columns[attribute.field ?? name] && !addedByPendingMigrations.includes(`${table}.${name}`)).map(([name]) => name);
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
// Notification flags that never worked were replaced by `notifications`; 009 drops them from stored preferences.
const retiredPreferenceKeys = ['emailNotifications', 'pushNotifications', 'taskReminders'];

// Runs pending migrations in one transaction, stopping before the categories rebuild, which needs its own connection state.
async function applyTransactionalMigrations(): Promise<void> {
  await sequelize.transaction(async transaction => {
    await sequelize.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY NOT NULL)', { transaction });
    const completed = await sequelize.query<{ name: string }>('SELECT name FROM schema_migrations', { type: QueryTypes.SELECT, transaction });
    const pending = requiredMigrations.filter(name => !completed.some(row => row.name === name));
    await validateExistingTables([
      ...(pending.includes('004-session-activity-intervals') ? ['study_sessions.trackingCoverage'] : []),
      ...(pending.includes(personalCategoriesMigration) ? ['categories.userId'] : []),
      ...(pending.includes('010-session-series') ? ['study_sessions.seriesId', 'study_sessions.seriesDate'] : []),
      ...(pending.includes('014-notification-reads') ? ['study_sessions.notificationReadAt'] : []),
    ]);
    for (const name of pending) {
      // The categories rebuild cannot run inside this transaction; it follows below.
      if (name === personalCategoriesMigration) break;
      const options: SyncOptions & Transactionable = { transaction };
      if (name === '001-initial-schema') await sequelize.sync(options);
      else if (name === '002-auth-sessions') { await AuthSession.sync(options); await RefreshCredential.sync(options); }
      else if (name === '003-user-preferences-v1') {
        const users = await sequelize.query<{ id: number; preferences: unknown }>('SELECT id, preferences FROM users', { type: QueryTypes.SELECT, transaction });
        for (const user of users) {
          const preferences = migrateStoredPreferences(user.preferences);
          await sequelize.query('UPDATE users SET preferences = :preferences WHERE id = :id', { replacements: { id: user.id, preferences: JSON.stringify(preferences) }, transaction });
        }
      }
      else if (name === '004-session-activity-intervals') {
        const query = sequelize.getQueryInterface();
        const inspectionOptions: { transaction: typeof transaction; logging: false } = { transaction, logging: false };
        const columns = await query.describeTable('study_sessions', inspectionOptions);
        if (!columns.trackingCoverage) await query.addColumn('study_sessions', 'trackingCoverage', { type: DataTypes.STRING, allowNull: false, defaultValue: 'untracked' }, { transaction });
        await SessionInterval.sync(options);
      }
      else if (name === '005-pomodoro-clocks') await PomodoroClock.sync(options);
      else if (name === '006-user-topic-progress') await UserTopicProgress.sync(options);
      else if (name === '007-password-reset-tokens') await PasswordResetToken.sync(options);
      else if (name === '009-notifications') {
        await PushSubscription.sync(options);
        await NotificationDelivery.sync(options);
        const users = await sequelize.query<{ id: number; preferences: unknown }>('SELECT id, preferences FROM users', { type: QueryTypes.SELECT, transaction });
        for (const user of users) {
          const preferences = typeof user.preferences === 'string' ? JSON.parse(user.preferences) as Record<string, unknown> : user.preferences as Record<string, unknown>;
          if (!retiredPreferenceKeys.some(key => key in preferences)) continue;
          const kept = Object.fromEntries(Object.entries(preferences).filter(([key]) => !retiredPreferenceKeys.includes(key)));
          await sequelize.query('UPDATE users SET preferences = :preferences WHERE id = :id', { replacements: { id: user.id, preferences: JSON.stringify(kept) }, transaction });
        }
      }
      else if (name === '010-session-series') {
        // Weekly routines; existing sessions only gain two empty columns.
        await SessionSeries.sync(options);
        const query = sequelize.getQueryInterface();
        const inspectionOptions: { transaction: typeof transaction; logging: false } = { transaction, logging: false };
        const columns = await query.describeTable('study_sessions', inspectionOptions);
        if (!columns.seriesId) await query.addColumn('study_sessions', 'seriesId', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'session_series', key: 'id' }, onDelete: 'SET NULL' }, { transaction });
        if (!columns.seriesDate) await query.addColumn('study_sessions', 'seriesDate', { type: DataTypes.STRING(10), allowNull: true }, { transaction });
        await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS `study_sessions_series_date` ON `study_sessions` (`seriesId`, `seriesDate`)', { transaction });
      }
      else if (name === '011-course-goals') await CourseGoal.sync(options);
      else if (name === '012-calendar-feeds') await CalendarFeed.sync(options);
      else if (name === '013-tags') { await Tag.sync(options); await CourseTag.sync(options); await SessionTag.sync(options); }
      else if (name === '014-notification-reads') {
        // When the person read the notice about a finished session; existing sessions stay unread until the browser
        // hands over what it had marked locally.
        const query = sequelize.getQueryInterface();
        const inspectionOptions: { transaction: typeof transaction; logging: false } = { transaction, logging: false };
        const columns = await query.describeTable('study_sessions', inspectionOptions);
        if (!columns.notificationReadAt) await query.addColumn('study_sessions', 'notificationReadAt', { type: DataTypes.DATE, allowNull: true }, { transaction });
      }
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (:name)', { replacements: { name }, transaction });
    }
  });
}

export async function applyMigrations(): Promise<void> {
  await applyTransactionalMigrations();
  const completed = await sequelize.query<{ name: string }>('SELECT name FROM schema_migrations WHERE name = :name', { replacements: { name: personalCategoriesMigration }, type: QueryTypes.SELECT });
  if (!completed.length) {
    await addCategoryOwners();
    // Migrations after 008 run in a second pass.
    await applyTransactionalMigrations();
  }
  await assertDatabaseReady();
}

const categoryIndexes = [
  'CREATE INDEX IF NOT EXISTS `categories_name` ON `categories` (`name`)',
  'CREATE INDEX IF NOT EXISTS `categories_order` ON `categories` (`order`)',
  'CREATE INDEX IF NOT EXISTS `categories_is_active` ON `categories` (`isActive`)',
  'CREATE INDEX IF NOT EXISTS `categories_user_id` ON `categories` (`userId`)',
  'CREATE UNIQUE INDEX IF NOT EXISTS `categories_shared_name` ON `categories` (`name`) WHERE `userId` IS NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS `categories_owner_name` ON `categories` (`userId`, `name`) WHERE `userId` IS NOT NULL',
];

/**
 * 008: categories gain an optional owner and per-owner name uniqueness.
 * SQLite cannot drop the original column-level UNIQUE(name), so a legacy table is rebuilt following
 * https://sqlite.org/lang_altertable.html#otheralter. The swap needs foreign keys off, which SQLite ignores
 * inside a transaction, and Sequelize gives each transaction its own connection; so this runs on the shared
 * connection with an explicit IMMEDIATE transaction and checks every foreign key before committing.
 */
async function addCategoryOwners(): Promise<void> {
  const run = (sql: string, replacements?: Record<string, unknown>) => sequelize.query(sql, replacements ? { replacements } : {});
  await run('PRAGMA foreign_keys = OFF');
  try {
    await run('BEGIN IMMEDIATE');
    try {
      const columns = await sequelize.getQueryInterface().describeTable('categories');
      if (!columns.userId) {
        const [sequence] = await sequelize.query<{ seq: number }>("SELECT seq FROM sqlite_sequence WHERE name = 'categories'", { type: QueryTypes.SELECT });
        await run('CREATE TABLE `categories_008` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` VARCHAR(100) NOT NULL, `description` TEXT, `color` VARCHAR(7) NOT NULL DEFAULT \'#3b82f6\', `icon` VARCHAR(50), `order` INTEGER NOT NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1, `userId` INTEGER REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)');
        await run('INSERT INTO `categories_008` (`id`, `name`, `description`, `color`, `icon`, `order`, `isActive`, `userId`, `createdAt`, `updatedAt`) SELECT `id`, `name`, `description`, `color`, `icon`, `order`, `isActive`, NULL, `createdAt`, `updatedAt` FROM `categories`');
        await run('DROP TABLE `categories`');
        await run('ALTER TABLE `categories_008` RENAME TO `categories`');
        // Keep the AUTOINCREMENT high-water mark so ids of deleted categories are never reused.
        if (sequence) await run("UPDATE sqlite_sequence SET seq = max(seq, :seq) WHERE name = 'categories'", { seq: sequence.seq });
      }
      for (const statement of categoryIndexes) await run(statement);
      const violations = await sequelize.query('PRAGMA foreign_key_check', { type: QueryTypes.SELECT });
      if (violations.length) throw new Error('Foreign key check failed after rebuilding categories');
      await run('INSERT INTO schema_migrations (name) VALUES (:name)', { name: personalCategoriesMigration });
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  } finally {
    await run('PRAGMA foreign_keys = ON');
  }
}
