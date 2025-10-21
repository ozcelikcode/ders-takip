import { User } from '../models/User';
import { Category } from '../models/Category';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const categories = [
  { name: 'İş', description: 'İş ile ilgili görevler', color: '#3b82f6', icon: 'Briefcase', order: 1 },
  { name: 'Eğitim', description: 'Öğrenme ve eğitim görevleri', color: '#10b981', icon: 'GraduationCap', order: 2 },
  { name: 'Kişisel Gelişim', description: 'Kişisel gelişim ve hobiler', color: '#8b5cf6', icon: 'Sparkles', order: 3 },
  { name: 'Sağlık & Spor', description: 'Sağlık ve egzersiz', color: '#ef4444', icon: 'Heart', order: 4 },
  { name: 'Projeler', description: 'Yazılım ve diğer projeler', color: '#f59e0b', icon: 'Code', order: 5 },
  { name: 'Toplantılar', description: 'Toplantılar ve görüşmeler', color: '#ec4899', icon: 'Users', order: 6 },
  { name: 'Diğer', description: 'Genel görevler', color: '#6b7280', icon: 'MoreHorizontal', order: 7 },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('\n🌱 Veritabanı seed işlemi başlıyor...\n');

    // Seed Admin User
    const existingAdmin = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || 'admin@localhost.com' },
    });

    if (!existingAdmin) {
      await User.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@localhost.com',
        password: process.env.ADMIN_PASSWORD || '12345678',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
      });

      console.log('✅ Admin kullanıcısı oluşturuldu');
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL || 'admin@localhost.com'}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || '12345678'}`);
      console.log(`👤 Username: ${process.env.ADMIN_USERNAME || 'admin'}\n`);
    } else {
      console.log('ℹ️  Admin kullanıcısı zaten mevcut\n');
    }

    // Seed Categories
    const existingCategoriesCount = await Category.count();

    if (existingCategoriesCount === 0) {
      await Category.bulkCreate(categories);
      console.log(`✅ ${categories.length} kategori oluşturuldu:`);
      categories.forEach(cat => console.log(`   - ${cat.name}`));
    } else {
      console.log(`ℹ️  ${existingCategoriesCount} kategori zaten mevcut`);
    }

    console.log('\n✅ Seed işlemi tamamlandı!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
};

seedDatabase();
