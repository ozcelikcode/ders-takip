import { accountExportFormat, type AccountExport } from '@study-tracker/contracts';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Category, Course, Plan, SessionInterval, StudySession, Topic, User, UserTopicProgress } from '../models';
import { revokeUserSessions } from './authSessions';
import { userResponse } from './userResponses';

function fail(statusCode: number, message: string): never { throw Object.assign(new Error(message), { statusCode }); }

// The site must keep at least one active administrator who can sign in and manage it.
async function assertNotLastAdmin(user: User, transaction: Transaction) {
  if (user.role !== 'admin' || !user.isActive) return;
  const others = await User.count({ where: { role: 'admin', isActive: true, id: { [Op.ne]: user.id } }, transaction });
  if (!others) fail(409, 'Son etkin yönetici hesabı silinemez. Önce başka bir yönetici atayın.');
}

/**
 * Deletes an account inside the caller's transaction. Private records go with it; sessions that pointed at them are
 * detached first so their history and measured time stay consistent. Shared records the user created stay (owner set null).
 */
export async function deleteAccount(user: User, transaction: Transaction): Promise<void> {
  await assertNotLastAdmin(user, transaction);
  const privateCourseIds = (await Course.findAll({ where: { userId: user.id, isGlobal: false }, attributes: ['id'], transaction })).map(course => course.id);
  if (privateCourseIds.length) {
    const privateTopicIds = (await Topic.findAll({ where: { courseId: { [Op.in]: privateCourseIds } }, attributes: ['id'], transaction })).map(topic => topic.id);
    await StudySession.update({ courseId: null, topicId: null }, {
      where: { [Op.or]: [{ courseId: { [Op.in]: privateCourseIds } }, ...(privateTopicIds.length ? [{ topicId: { [Op.in]: privateTopicIds } }] : [])] },
      transaction,
    });
    await Course.destroy({ where: { id: { [Op.in]: privateCourseIds } }, transaction });
  }
  await revokeUserSessions(user.id, transaction);
  // Personal categories, plans, sessions, progress and reset tokens follow through ON DELETE CASCADE.
  await user.destroy({ transaction });
}

/** Self-service deletion: the current password confirms it. */
export async function deleteOwnAccount(userId: number, password: string): Promise<void> {
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const user = await User.findByPk(userId, { transaction });
    if (!user) fail(404, 'Kullanıcı bulunamadı');
    if (!(await user.comparePassword(password))) fail(400, 'Şifre hatalı');
    await deleteAccount(user, transaction);
  });
}

const plain = <T extends { get: (options: { plain: true }) => unknown }>(rows: T[]) => rows.map(row => row.get({ plain: true }));

/** Everything the account owns, as plain JSON. Shared records are referenced only through the user's own data. */
export async function exportAccount(userId: number): Promise<AccountExport> {
  return sequelize.transaction(async transaction => {
    const user = await User.findByPk(userId, { transaction });
    if (!user) fail(404, 'Kullanıcı bulunamadı');
    const [categories, courses, topicProgress, sessions, plans] = await Promise.all([
      Category.findAll({ where: { userId }, order: [['id', 'ASC']], transaction }),
      Course.findAll({ where: { userId }, include: [{ model: Topic, as: 'topics' }], order: [['id', 'ASC']], transaction }),
      UserTopicProgress.findAll({
        where: { userId },
        include: [{ model: Topic, as: 'topic', attributes: ['id', 'name', 'courseId'], include: [{ model: Course, as: 'course', attributes: ['id', 'name'] }] }],
        transaction,
      }),
      StudySession.findAll({ where: { userId }, include: [{ model: SessionInterval, as: 'activityIntervals' }], order: [['startTime', 'ASC']], transaction }),
      Plan.findAll({ where: { userId }, order: [['id', 'ASC']], transaction }),
    ]);
    return {
      format: accountExportFormat,
      version: 1,
      exportedAt: new Date().toISOString(),
      account: userResponse(user),
      categories: plain(categories),
      courses: plain(courses),
      topicProgress: plain(topicProgress),
      sessions: plain(sessions),
      plans: plain(plans),
    };
  });
}
