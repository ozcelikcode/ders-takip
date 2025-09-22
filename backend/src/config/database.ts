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
    await sequelize.sync();
    console.log('✅ Database modelleri senkronize edildi');
  } catch (error) {
    console.error('❌ SQLite bağlantı hatası:', error);
    process.exit(1);
  }
};