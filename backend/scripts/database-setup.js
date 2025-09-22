const { sequelize } = require('../dist/config/database');

async function setupDatabase() {
  try {
    console.log('🗄️  SQLite veritabanı kuruluyor...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ SQLite bağlantısı başarılı');

    // Sync all models (create tables)
    await sequelize.sync({ force: true });
    console.log('✅ Tablolar oluşturuldu');

    console.log('🎉 SQLite veritabanı kurulumu tamamlandı!');
    console.log('📁 Database dosyası: backend/database.sqlite');

  } catch (error) {
    console.error('❌ SQLite kurulumu sırasında hata:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase().finally(async () => {
    await sequelize.close();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  });
}

module.exports = setupDatabase;