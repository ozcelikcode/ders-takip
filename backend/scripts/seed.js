const { sequelize } = require('../dist/config/database');
const { User, Course, Topic } = require('../dist/models/index');

const seedData = {
  courses: [
    // TYT Dersleri
    { name: 'Türkçe', category: 'TYT', description: 'Türk Dili ve Edebiyatı', color: '#ef4444', icon: 'BookOpen', order: 1 },
    { name: 'Temel Matematik', category: 'TYT', description: 'Temel Matematik Konuları', color: '#3b82f6', icon: 'Calculator', order: 2 },
    { name: 'Fen Bilimleri', category: 'TYT', description: 'Fizik, Kimya, Biyoloji Temel', color: '#10b981', icon: 'Microscope', order: 3 },
    { name: 'Sosyal Bilimler', category: 'TYT', description: 'Tarih, Coğrafya, Felsefe', color: '#f59e0b', icon: 'Globe', order: 4 },

    // AYT Dersleri
    { name: 'Matematik', category: 'AYT', description: 'AYT Matematik', color: '#8b5cf6', icon: 'Calculator', order: 5 },
    { name: 'Geometri', category: 'AYT', description: 'AYT Geometri', color: '#f97316', icon: 'Triangle', order: 6 },
    { name: 'Fizik', category: 'AYT', description: 'AYT Fizik', color: '#ec4899', icon: 'Atom', order: 7 },
    { name: 'Kimya', category: 'AYT', description: 'AYT Kimya', color: '#06b6d4', icon: 'FlaskConical', order: 8 },
    { name: 'Biyoloji', category: 'AYT', description: 'AYT Biyoloji', color: '#84cc16', icon: 'Dna', order: 9 },
    { name: 'Tarih', category: 'AYT', description: 'AYT Tarih', color: '#a855f7', icon: 'Landmark', order: 10 },
    { name: 'Coğrafya', category: 'AYT', description: 'AYT Coğrafya', color: '#059669', icon: 'Map', order: 11 },
    { name: 'Felsefe', category: 'AYT', description: 'AYT Felsefe', color: '#7c3aed', icon: 'Brain', order: 12 },
    { name: 'Din Kültürü', category: 'AYT', description: 'AYT Din Kültürü ve Ahlak Bilgisi', color: '#dc2626', icon: 'Heart', order: 13 },
    { name: 'Edebiyat', category: 'AYT', description: 'AYT Türk Dili ve Edebiyatı', color: '#be123c', icon: 'BookText', order: 14 },
  ],

  topics: {
    // TYT Konuları
    'Türkçe': [
      'Ses Bilgisi', 'Yazım Kuralları', 'Noktalama İşaretleri', 'Kelime Türleri', 'Sözcükte Anlam',
      'Cümlede Anlam', 'Parçada Anlam', 'Paragraf', 'Dil Bilgisi', 'Anlatım Biçimleri',
      'Yazınsal Metinler', 'Bilgilendirici Metinler', 'Şiir İncelemesi', 'Edebî Dönemler', 'Retorik'
    ],
    'Temel Matematik': [
      'Doğal Sayılar', 'Tam Sayılar', 'Rasyonel Sayılar', 'Reel Sayılar', 'Üslü İfadeler',
      'Köklü İfadeler', 'Cebirsel İfadeler', 'Eşitsizlikler', 'Mutlak Değer', 'Faktöriyel',
      'Oran-Orantı', 'Yüzdeler', 'Basit Faiz-Bileşik Faiz', 'Fonksiyonlar', 'Polinomlar',
      'İkinci Dereceden Denklemler', 'Permütasyon-Kombinasyon', 'Olasılık', 'İstatistik', 'Diziler',
      'Logaritma', 'Trigonometri Temelleri', 'Analitik Geometri Temelleri'
    ],
    'Fen Bilimleri': [
      // Fizik
      'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet', 'Enerji', 'Isı ve Sıcaklık',
      'Elektrostatik', 'Dalgalar', 'Optik',
      // Kimya
      'Kimya Bilimine Giriş', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler',
      'Maddenin Halleri', 'Doğa ve Kimya', 'Hayat ve Kimya',
      // Biyoloji
      'Yaşam Bilimi Biyoloji', 'Hücre', 'Canlıların Çeşitliliği ve Sınıflandırılması', 'Canlıların Yapısı ve İşlevi',
      'Kalıtım', 'Ekosistem Ekolojisi ve Güncel Çevre Sorunları'
    ],
    'Sosyal Bilimler': [
      // Tarih
      'Tarih Öncesi Çağlar', 'İlk ve Orta Çağ Türk Devletleri', 'İslam Tarihi ve Medeniyeti',
      'Türkiye Tarihi', 'Yakınçağ Avrupa Tarihi', 'XX. Yüzyıl Başlarında Osmanlı Devleti',
      // Coğrafya
      'Doğal Sistemler', 'Beşeri Sistemler', 'Küresel Ortam', 'Ülkemiz ve Çevre Ülkeler',
      'Çevre ve Toplum', 'Türkiye Coğrafyası',
      // Felsefe
      'Felsefe Nedir?', 'Felsefi Düşünme', 'Felsefenin Temel Disiplinleri'
    ],

    // AYT Konuları
    'Matematik': [
      'Temel Kavramlar ve Mantık', 'Sayılar ve Sayı Basamakları', 'Bölünebilme', 'Modüler Aritmetik',
      'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü ve Köklü İfadeler',
      'Çarpanlara Ayırma', 'Oran ve Orantı', 'Denklem ve Eşitsizlik Sistemleri', 'Fonksiyonlar',
      'Polinomlar', 'İkinci Dereceden Denklemler', 'Logaritma', 'Diziler ve Seriler',
      'Limit ve Süreklilik', 'Türev', 'İntegral', 'Permütasyon ve Kombinasyon', 'Olasılık',
      'Trigonometri', 'Kompleks Sayılar'
    ],
    'Geometri': [
      'Doğru, Doğru Parçası, Işın', 'Açılar', 'Üçgenler', 'Üçgenlerde Benzerlik', 'Üçgenlerde Eşlik',
      'Dik Üçgenler', 'İkizkenar ve Eşkenar Üçgenler', 'Yamuk ve Paralelkenar', 'Dikdörtgen, Kare, Eşkenar Dörtgen',
      'Çember ve Daire', 'Çemberde Açılar', 'Çemberde Uzunluklar', 'Çokgenler', 'Dönüşüm Geometrisi',
      'Analitik Geometri', 'Katı Cisimler', 'Hacim Hesaplamaları', 'Yüzey Alanı Hesaplamaları'
    ],
    'Fizik': [
      'Fizik Bilimine Giriş', 'Hareket', 'Kuvvet ve Hareket', 'İş, Güç, Enerji', 'İtme ve Momentum',
      'Denge ve Denge Şartları', 'Basınç ve Kaldırma Kuvveti', 'Isı ve Sıcaklık', 'Hal Değişimi',
      'Elektrik ve Manyetizma', 'Elektrik Akımı', 'Elektromanyetik İndüklenme', 'Alternatif Akım',
      'Dalgalar', 'Ses Dalgaları', 'Işık', 'Optik', 'Atom Fiziği', 'Radioaktivite'
    ],
    'Kimya': [
      'Modern Atom Teorisi', 'Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler', 'Gazlar',
      'Sıvılar', 'Katılar', 'Çözeltiler', 'Kimyasal Tepkimelerde Enerji', 'Kimyasal Tepkimelerde Hız',
      'Kimyasal Tepkimelerde Denge', 'Asit-Baz Dengesi', 'Çözünürlük Dengesi', 'Elektrokimya',
      'Karbon Kimyasına Giriş', 'Organik Bileşikler', 'Enerji Kaynakları ve Çevre Kimyası'
    ],
    'Biyoloji': [
      'Canlıların Ortak Özellikleri', 'Hücre', 'Canlıların Sınıflandırılması', 'Hücre Bölünmeleri',
      'Kalıtım', 'Canlılarda Enerji Dönüşümleri', 'Bitkilerde Madde Taşınması', 'Hayvanlarda Dolaşım',
      'Hayvanlarda Sindirim', 'Hayvanlarda Solunum', 'Hayvanlarda Boşaltım', 'Sinir Sistemi',
      'Endokrin Sistem', 'Üreme Sistemi ve Embriyonik Gelişim', 'Duyu Organları', 'Destek ve Hareket',
      'İmmünite', 'Bitki Biyolojisi', 'Ekoloji'
    ],
    'Tarih': [
      'Tarih Bilimi', 'Uygarlığın Doğuşu ve İlk Uygarlıklar', 'Antik Çağ Uygarlıkları', 'İlk Türk Devletleri',
      'İslamiyet\'in Doğuşu ve İlk Dönem İslam Tarihi', 'Türklerin İslamiyeti Kabulü', 'Selçuklu Devleti',
      'Anadolu Selçuklu Devleti', 'Beylikler Dönemi', 'Osmanlı Devleti\'nin Kuruluşu', 'Osmanlı Devleti\'nin Yükselişi',
      'Osmanlı Devleti\'nin Duraklama Dönemi', 'Osmanlı Devleti\'nin Gerileme Dönemi', 'Osmanlı Devleti\'nde Islahat Hareketleri',
      'Millî Mücadele', 'Türkiye Cumhuriyeti\'nin İlk Yılları', 'Atatürk Dönemi', 'Çok Partili Dönem'
    ],
    'Coğrafya': [
      'Coğrafya Bilimi', 'Harita Bilgisi', 'Dünya\'nın Şekli ve Hareketleri', 'Saat Dilimleri',
      'İklim', 'İç Kuvvetler ve Yer Şekilleri', 'Dış Kuvvetler ve Yer Şekilleri', 'Hidrografya',
      'Bitkiler Coğrafyası', 'Toprak Coğrafyası', 'Nüfus Coğrafyası', 'Yerleşme Coğrafyası',
      'Ekonomik Faaliyetler', 'Ulaşım ve Haberleşme', 'Bölgeler Coğrafyası', 'Türkiye\'nin Coğrafi Bölgeleri'
    ],
    'Felsefe': [
      'Felsefe Nedir?', 'Felsefi Düşünme', 'Felsefenin Temel Disiplinleri', 'Bilgi Felsefesi',
      'Varlık Felsefesi', 'Ahlak Felsefesi', 'Siyaset Felsefesi', 'Sanat Felsefesi', 'Din Felsefesi',
      'Bilim Felsefesi', 'Dil Felsefesi', 'Çevre Felsefesi', 'Kadın Felsefesi', 'Doğu Felsefesi',
      'İslam Felsefesi', 'Türk Felsefesi'
    ],
    'Din Kültürü': [
      'Din ve İnsan', 'İslam Dini', 'İman', 'İbadet', 'Kur\'an-ı Kerim', 'Hz. Muhammed',
      'İslam Düşüncesi', 'İslam Tarihi', 'Dinler Tarihi', 'Din Sosyolojisi', 'Din Psikolojisi',
      'Güncel Dini Meseleler', 'Dinlerarası Diyalog', 'Ahlak', 'İnsan Hakları', 'Çevre Etiği'
    ],
    'Edebiyat': [
      'Edebiyat Bilgisi', 'Nazım Bilgisi', 'Eski Türk Edebiyatı', 'Tanzimat Dönemi', 'Servet-i Fünun',
      'Millî Edebiyat', 'Cumhuriyet Dönemi Edebiyatı', 'Modern Türk Şiiri', 'Modern Türk Hikayesi',
      'Modern Türk Romanı', 'Modern Türk Tiyatrosu', 'Dünya Edebiyatı', 'Karşılaştırmalı Edebiyat',
      'Eleştiri Kuramları', 'Dil ve Anlatım', 'Söz Sanatları'
    ]
  }
};

async function seedDatabase() {
  try {
    console.log('🌱 Örnek veriler yükleniyor...');

    await sequelize.authenticate();
    console.log('🔗 SQLite veritabanına bağlandı');

    // Sync models (create tables and clear existing data)
    await sequelize.sync({ force: true });
    console.log('✅ Tablolar temizlendi ve yeniden oluşturuldu');

    console.log('👤 Admin kullanıcısı oluşturuluyor...');

    const adminUser = await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@localhost.com',
      password: process.env.ADMIN_PASSWORD || '12345678',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    console.log('✅ Admin kullanıcısı oluşturuldu');

    console.log('👤 Test öğrenci kullanıcısı oluşturuluyor...');

    const testUser = await User.create({
      username: 'test',
      email: 'test@email.com',
      password: '123456',
      firstName: 'Test',
      lastName: 'Öğrenci',
      role: 'student'
    });

    console.log('✅ Test öğrenci kullanıcısı oluşturuldu');

    console.log('📚 Dersler oluşturuluyor...');
    const courses = await Course.bulkCreate(seedData.courses);
    console.log(`✅ ${courses.length} ders oluşturuldu`);

    console.log('📖 Konular oluşturuluyor...');
    let topicCount = 0;

    for (const course of courses) {
      let topicNames = [];

      // TYT Dersleri
      if (course.name === 'Türkçe' && course.category === 'TYT') {
        topicNames = seedData.topics['Türkçe'];
      } else if (course.name === 'Temel Matematik' && course.category === 'TYT') {
        topicNames = seedData.topics['Temel Matematik'];
      } else if (course.name === 'Fen Bilimleri' && course.category === 'TYT') {
        topicNames = seedData.topics['Fen Bilimleri'];
      } else if (course.name === 'Sosyal Bilimler' && course.category === 'TYT') {
        topicNames = seedData.topics['Sosyal Bilimler'];
      }
      // AYT Dersleri
      else if (course.name === 'Matematik' && course.category === 'AYT') {
        topicNames = seedData.topics['Matematik'];
      } else if (course.name === 'Geometri' && course.category === 'AYT') {
        topicNames = seedData.topics['Geometri'];
      } else if (course.name === 'Fizik' && course.category === 'AYT') {
        topicNames = seedData.topics['Fizik'];
      } else if (course.name === 'Kimya' && course.category === 'AYT') {
        topicNames = seedData.topics['Kimya'];
      } else if (course.name === 'Biyoloji' && course.category === 'AYT') {
        topicNames = seedData.topics['Biyoloji'];
      } else if (course.name === 'Tarih' && course.category === 'AYT') {
        topicNames = seedData.topics['Tarih'];
      } else if (course.name === 'Coğrafya' && course.category === 'AYT') {
        topicNames = seedData.topics['Coğrafya'];
      } else if (course.name === 'Felsefe' && course.category === 'AYT') {
        topicNames = seedData.topics['Felsefe'];
      } else if (course.name === 'Din Kültürü' && course.category === 'AYT') {
        topicNames = seedData.topics['Din Kültürü'];
      } else if (course.name === 'Edebiyat' && course.category === 'AYT') {
        topicNames = seedData.topics['Edebiyat'];
      } else {
        topicNames = ['Temel Konular', 'Orta Düzey Konular', 'İleri Düzey Konular'];
      }

      const topics = topicNames.map((name, index) => ({
        name,
        courseId: course.id,
        description: `${course.name} - ${name} konusu`,
        estimatedTime: Math.floor(Math.random() * 180) + 30,
        difficulty: ['Kolay', 'Orta', 'Zor'][Math.floor(Math.random() * 3)],
        order: index + 1
      }));

      await Topic.bulkCreate(topics);
      topicCount += topics.length;
    }

    console.log(`✅ ${topicCount} konu oluşturuldu`);

    console.log('🎉 2025 YKS Müfredatı seed veriler başarıyla yüklendi!');
    console.log('📋 Oluşturulan veriler:');
    console.log(`   👤 1 Admin kullanıcı + 1 Test öğrenci`);
    console.log(`   📚 ${courses.length} Ders (4 TYT + 10 AYT)`);
    console.log(`   📖 ${topicCount} Konu (2025 Müfredatı)`);
    console.log('');
    console.log('📚 TYT Dersleri: Türkçe, Temel Matematik, Fen Bilimleri, Sosyal Bilimler');
    console.log('📚 AYT Dersleri: Matematik, Geometri, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe, Din Kültürü, Edebiyat');
    console.log('');
    console.log('🔑 Giriş bilgileri:');
    console.log('   👨‍💼 Admin:');
    console.log(`     📧 Email: ${process.env.ADMIN_EMAIL || 'admin@localhost.com'}`);
    console.log(`     🔒 Şifre: ${process.env.ADMIN_PASSWORD || '12345678'}`);
    console.log('   👨‍🎓 Test Öğrenci:');
    console.log(`     📧 Email: test@email.com`);
    console.log(`     🔒 Şifre: 123456`);

  } catch (error) {
    console.error('❌ Seed işlemi sırasında hata:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Veritabanı bağlantısı kapatıldı.');
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;