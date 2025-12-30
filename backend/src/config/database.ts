import { Sequelize } from 'sequelize';
import path from 'path';

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false, // Temiz terminal çıktısı için SQL logları kapatıldı
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
});

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite veritabanı bağlantısı başarılı');

    // First, drop any leftover backup tables that cause sync issues
    try {
      const [results] = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'"
      );
      for (const row of results as any[]) {
        await sequelize.query(`DROP TABLE IF EXISTS "${row.name}"`);
        console.log(`🗑️ Backup tablosu silindi: ${row.name}`);
      }
    } catch (e) {
      // Ignore errors when dropping backup tables
    }

    // Sync all models - using simple sync without alter to avoid backup table issues
    // force: false ensures we don't drop existing tables
    await sequelize.sync({ force: false });

    console.log('✅ Database modelleri senkronize edildi');
  } catch (error) {
    console.error('❌ SQLite bağlantı hatası:', error);
    process.exit(1);
  }
};
