import { z } from 'zod';
import { connectDB, sequelize } from '../config/database';
import { getEnvironment } from '../config/environment';
import { assertDatabaseReady } from '../database/migrations';
import { Category, User } from '../models';

const categories = [
  { name: 'İş', description: 'İş ile ilgili görevler', color: '#3b82f6', icon: 'Briefcase', order: 1 },
  { name: 'Eğitim', description: 'Öğrenme ve eğitim görevleri', color: '#10b981', icon: 'GraduationCap', order: 2 },
  { name: 'Kişisel Gelişim', description: 'Kişisel gelişim ve hobiler', color: '#8b5cf6', icon: 'Sparkles', order: 3 },
  { name: 'Sağlık & Spor', description: 'Sağlık ve egzersiz', color: '#ef4444', icon: 'Heart', order: 4 },
  { name: 'Projeler', description: 'Yazılım ve diğer projeler', color: '#f59e0b', icon: 'Code', order: 5 },
  { name: 'Toplantılar', description: 'Toplantılar ve görüşmeler', color: '#ec4899', icon: 'Users', order: 6 },
  { name: 'Diğer', description: 'Genel görevler', color: '#6b7280', icon: 'MoreHorizontal', order: 7 },
];


async function seedDevelopmentData() {
  if (getEnvironment().NODE_ENV !== 'development') throw new Error('Development seeding is only allowed in development.');
  const admin = z.object({
    ADMIN_EMAIL: z.email(),
    ADMIN_USERNAME: z.string().min(3).max(20).regex(/^[a-zA-Z0-9]+$/),
    ADMIN_PASSWORD: z.string().min(12).refine(value => Buffer.byteLength(value, 'utf8') <= 72),
  }).safeParse(process.env);
  if (!admin.success) throw new Error('Set ADMIN_EMAIL, ADMIN_USERNAME and a password of at least 12 characters before seeding.');
  await connectDB();
  await assertDatabaseReady();
  await sequelize.transaction(async (transaction) => {
    await User.findOrCreate({
      where: { email: admin.data.ADMIN_EMAIL },
      defaults: { username: admin.data.ADMIN_USERNAME, email: admin.data.ADMIN_EMAIL, password: admin.data.ADMIN_PASSWORD, firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true },
      transaction,
    });
    for (const category of categories) {
      await Category.findOrCreate({ where: { name: category.name }, defaults: category, transaction });
    }
  });
  console.log('Development seed completed. Existing records were preserved.');
}

void seedDevelopmentData().catch((error: unknown) => {
  console.error('Development seed failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exitCode = 1;
}).finally(() => sequelize.close());
