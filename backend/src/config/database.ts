import { Sequelize } from 'sequelize';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: isDevelopment ? console.log : false,
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

    // Sync all models
    // In development with SQLite, we might need to disable foreign keys for alter: true to work
    await sequelize.query('PRAGMA foreign_keys = OFF');
    await sequelize.sync({ alter: true });
    await sequelize.query('PRAGMA foreign_keys = ON');

    console.log('✅ Database modelleri senkronize edildi');
  } catch (error) {
    console.error('❌ SQLite bağlantı hatası:', error);
    process.exit(1);
  }
};