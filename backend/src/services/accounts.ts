import { accountExportFormat, accountExportVersion, type AccountExport, type AccountReferences, type TagAssignments, fail } from '@study-tracker/contracts';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Category, Course, CourseGoal, Plan, SessionInterval, SessionSeries, StudySession, Topic, User, UserTopicProgress } from '../models';
import { listTags } from './tags';
import { revokeUserSessions } from './authSessions';
import { userResponse } from './userResponses';


// The site must keep at least one active administrator who can sign in and manage it.
async function assertNotLastAdmin(user: User, transaction: Transaction) {
  if (user.role !== 'admin' || !user.isActive) return;
  const others = await User.count({ where: { role: 'admin', isActive: true, id: { [Op.ne]: user.id } }, transaction });
  if (!others) fail(409, 'lastAdmin');
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
    if (!user) fail(404, 'userNotFound');
    if (!(await user.comparePassword(password))) fail(400, 'wrongPassword');
    await deleteAccount(user, transaction);
  });
}

const plain = <T extends { get: (options: { plain: true }) => unknown }>(rows: T[]) => rows.map(row => row.get({ plain: true }));
const present = (ids: (number | null | undefined)[], except: Set<number>) => [...new Set(ids)].filter((id): id is number => !!id && !except.has(id));

/** Shared categories, records and sub-records the account's data points at, named so another site can match them. */
async function sharedReferences(
  data: { categories: Category[]; courses: Course[]; sessions: StudySession[]; routines: SessionSeries[]; courseGoals: CourseGoal[]; topicProgress: UserTopicProgress[]; tags: TagAssignments },
  transaction: Transaction,
): Promise<AccountReferences> {
  const ownCourses = new Set(data.courses.map(course => course.id));
  const ownTopics = new Set(data.courses.flatMap(course => (course.topics ?? []).map(topic => topic.id)));
  const topicIds = present([...data.sessions, ...data.routines].map(row => row.topicId).concat(data.topicProgress.map(row => row.topicId)), ownTopics);
  const topics = topicIds.length ? await Topic.findAll({ where: { id: topicIds }, order: [['id', 'ASC']], transaction }) : [];
  const courseIds = present([
    ...[...data.sessions, ...data.routines, ...data.courseGoals, ...data.tags.courseTags].map(row => row.courseId),
    ...topics.map(topic => topic.courseId),
  ], ownCourses);
  const courses = courseIds.length ? await Course.findAll({ where: { id: courseIds, isGlobal: true }, order: [['id', 'ASC']], transaction }) : [];
  const shared = new Set(courses.map(course => course.id));
  const categoryIds = present([...data.courses, ...courses].map(course => course.categoryId), new Set(data.categories.map(category => category.id)));
  const categories = categoryIds.length ? await Category.findAll({ where: { id: categoryIds, userId: null }, order: [['id', 'ASC']], transaction }) : [];
  return {
    categories: categories.map(({ id, name, color }) => ({ id, name, color })),
    courses: courses.map(({ id, name, color, categoryId }) => ({ id, name, color, categoryId })),
    topics: topics.filter(topic => shared.has(topic.courseId)).map(({ id, courseId, name, estimatedTime, difficulty }) => ({ id, courseId, name, estimatedTime, difficulty })),
  };
}

/** Everything the account owns, as plain JSON. Shared records are referenced only through the user's own data. */
export async function exportAccount(userId: number): Promise<AccountExport> {
  return sequelize.transaction(async transaction => {
    const user = await User.findByPk(userId, { transaction });
    if (!user) fail(404, 'userNotFound');
    const [categories, courses, topicProgress, sessions, plans, routines, courseGoals] = await Promise.all([
      Category.findAll({ where: { userId }, order: [['id', 'ASC']], transaction }),
      Course.findAll({ where: { userId }, include: [{ model: Topic, as: 'topics' }], order: [['id', 'ASC']], transaction }),
      UserTopicProgress.findAll({
        where: { userId },
        include: [{ model: Topic, as: 'topic', attributes: ['id', 'name', 'courseId'], include: [{ model: Course, as: 'course', attributes: ['id', 'name'] }] }],
        transaction,
      }),
      StudySession.findAll({ where: { userId }, include: [{ model: SessionInterval, as: 'activityIntervals' }], order: [['startTime', 'ASC']], transaction }),
      Plan.findAll({ where: { userId }, order: [['id', 'ASC']], transaction }),
      SessionSeries.findAll({ where: { userId }, order: [['id', 'ASC']], transaction }),
      CourseGoal.findAll({ where: { userId }, order: [['courseId', 'ASC']], transaction }),
    ]);
    const tags = await listTags({ id: userId, role: user.role });
    return {
      format: accountExportFormat,
      version: accountExportVersion,
      exportedAt: new Date().toISOString(),
      account: userResponse(user),
      categories: plain(categories),
      courses: plain(courses),
      topicProgress: plain(topicProgress),
      sessions: plain(sessions),
      plans: plain(plans),
      routines: plain(routines),
      courseGoals: plain(courseGoals),
      tags,
      references: await sharedReferences({ categories, courses, sessions, routines, courseGoals, topicProgress, tags }, transaction),
    };
  });
}
