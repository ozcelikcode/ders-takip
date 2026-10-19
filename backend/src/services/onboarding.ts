import { Op, Transaction } from 'sequelize';
import { needsOnboarding, preferencesSchema, type CompleteOnboardingInput, type OnboardingWorkspace } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Category, Course, User } from '../models';

function fail(statusCode: number, message: string): never { throw Object.assign(new Error(message), { statusCode }); }

// A name the user can already see is reused, so onboarding never duplicates a shared or earlier record.
async function personalCategory(userId: number, name: string, transaction: Transaction) {
  const existing = await Category.findOne({ where: { name, [Op.or]: [{ userId: null }, { userId }] }, order: [['userId', 'DESC']], transaction });
  if (existing) return existing;
  const order = ((await Category.max<number, Category>('order', { where: { [Op.or]: [{ userId: null }, { userId }] }, transaction })) || 0) + 1;
  return Category.create({ name, order, userId, color: '#3b82f6' }, { transaction });
}

async function firstCourses(userId: number, workspace: OnboardingWorkspace, transaction: Transaction) {
  const category = await personalCategory(userId, workspace.categoryName, transaction);
  const visible = await Course.findAll({ where: { categoryId: category.id, [Op.or]: [{ userId }, { isGlobal: true }] }, attributes: ['name', 'order'], transaction });
  let order = Math.max(0, ...visible.map(course => course.order));
  for (const name of workspace.courseNames) {
    if (visible.some(course => course.name === name)) continue;
    await Course.create({ name, categoryId: category.id, userId, isGlobal: false, color: category.color, order: ++order }, { transaction });
  }
}

/** Applies the welcome answers and marks onboarding finished in one transaction. */
export async function completeOnboarding(userId: number, input: CompleteOnboardingInput): Promise<User> {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const user = await User.findByPk(userId, { transaction });
    if (!user?.isActive) fail(404, 'Kullanıcı bulunamadı');
    if (!needsOnboarding(user.preferences)) fail(409, 'Kurulum zaten tamamlandı');
    if (input.workspace) await firstCourses(userId, input.workspace, transaction);
    user.preferences = { ...user.preferences, ...preferencesSchema.parse({ ...user.preferences, ...input.preferences, onboarding: 'done' }) };
    await user.save({ transaction });
    return user;
  });
}
