const setupDatabase = require('./database-setup');
const seedDatabase = require('./seed');

async function setup() {
  console.log('🚀 Ders Takip Sistemi Kurulumu Başlıyor...\n');

  try {
    console.log('1️⃣ SQLite veritabanı kuruluyor...');
    await setupDatabase();
    console.log('');

    console.log('2️⃣ Örnek veriler yükleniyor...');
    await seedDatabase();
    console.log('');

    console.log('🎉 Kurulum başarıyla tamamlandı!');
    console.log('');
    console.log('🏃‍♂️ Sistemi başlatmak için:');
    console.log('   npm run dev');
    console.log('');
    console.log('🌐 Frontend için:');
    console.log('   cd ../frontend && npm run dev');
    console.log('');
    console.log('📊 API Health Check:');
    console.log('   http://localhost:5000/api/health');

  } catch (error) {
    console.error('❌ Kurulum sırasında hata:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setup();
}

module.exports = setup;