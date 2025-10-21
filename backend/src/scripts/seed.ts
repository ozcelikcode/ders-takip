import { User } from '../models/User';
import { connectDB } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { email: process.env.ADMIN_EMAIL || 'admin@localhost.com' },
    });

    if (existingAdmin) {
      console.log('✅ Admin kullanıcısı zaten mevcut');
      process.exit(0);
    }

    // Create admin user
    await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@localhost.com',
      password: process.env.ADMIN_PASSWORD || '12345678',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    });

    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!');
    console.log(`📧 Email: ${process.env.ADMIN_EMAIL || 'admin@localhost.com'}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || '12345678'}`);
    console.log(`👤 Username: ${process.env.ADMIN_USERNAME || 'admin'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
};

seedAdmin();
