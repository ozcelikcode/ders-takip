import { Op, Transaction } from 'sequelize';
import { z } from 'zod';
import {
  accountExportFormat, accountExportVersion, accountImportSchema, fail, foldSearchText, mergePreferences, preferencesSchema,
  type AccountImport, type AccountImportResult,
} from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Category, Course, CourseGoal, CourseTag, Plan, SessionInterval, SessionSeries, SessionTag, StudySession, Tag, Topic, User, UserTopicProgress } from '../models';
import { extendAllSeries } from './sessionSeries';

type File = AccountImport;
type OwnCourse = File['courses'][number];
type SourceTopic = OwnCourse['topics'][number];
type SessionRow = File['sessions'][number];
interface Placed { id: number; writable: boolean }
interface CatalogSource { name: string; color: string; description?: string | null | undefined; icon?: string | null | undefined; order?: number | undefined; isActive?: boolean | undefined }
/** Leaves out optional fields the export had empty; the models take an absent field, not null. */
const defined = <T extends Record<string, unknown>>(values: T) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value != null)) as { [K in keyof T]?: Exclude<T[K], null | undefined> };

const chunkSize = 500;
async function inChunks<T, R>(rows: T[], write: (part: T[]) => Promise<R[]>): Promise<R[]> {
  const created: R[] = [];
  for (let start = 0; start < rows.length; start += chunkSize) created.push(...await write(rows.slice(start, start + chunkSize)));
  return created;
}

/** Reads an uploaded export. An older format is refused with its own code so the person knows to export again. */
export function parseAccountImport(body: unknown): AccountImport {
  const header = z.object({ format: z.literal(accountExportFormat), version: z.number() }).safeParse(body);
  if (!header.success) fail(400, 'importInvalid');
  if (header.data.version < accountExportVersion) fail(400, 'importOutdated');
  const parsed = accountImportSchema.safeParse(body);
  if (!parsed.success) fail(400, 'importInvalid');
  return parsed.data;
}

async function assertEmpty(userId: number, transaction: Transaction) {
  const where = { userId };
  const owned = await Promise.all([
    Category.count({ where, transaction }), Course.count({ where, transaction }), StudySession.count({ where, transaction }),
    Plan.count({ where, transaction }), SessionSeries.count({ where, transaction }), CourseGoal.count({ where, transaction }),
    Tag.count({ where, transaction }), UserTopicProgress.count({ where, transaction }),
  ]);
  if (owned.some(Boolean)) fail(409, 'accountNotEmpty');
}

/**
 * Places one export into an empty account. Ids from the other site are mapped to new ones; shared records are matched
 * by name and, where this site has none, become the person's own records so nothing loses its record.
 */
class AccountImporter {
  readonly result: AccountImportResult = {
    created: { categories: 0, courses: 0, topics: 0, plans: 0, routines: 0, sessions: 0, tags: 0, courseGoals: 0, topicProgress: 0 },
    matchedShared: 0,
    unlinked: 0,
    preferences: 'skipped',
  };
  private readonly categories = new Map<number, number>();
  private readonly courses = new Map<number, Placed | null>();
  private readonly topics = new Map<number, { id: number; courseId: number } | null>();
  private readonly references;

  constructor(private readonly userId: number, private readonly file: File, private readonly transaction: Transaction) {
    const byId = <T extends { id: number }>(rows: T[]) => new Map(rows.map(row => [row.id, row]));
    this.references = { categories: byId(file.references.categories), courses: byId(file.references.courses), topics: byId(file.references.topics) };
  }

  private visible() { return { [Op.or]: [{ userId: null }, { userId: this.userId }] }; }

  /** A visible category with the name, the person's own first; otherwise a new personal one. */
  private async categoryNamed(source: CatalogSource) {
    const { transaction } = this;
    const existing = await Category.findOne({ where: { name: source.name, ...this.visible() }, order: [['userId', 'DESC']], transaction });
    if (existing) return existing.id;
    const order = source.order ?? ((await Category.max<number, Category>('order', { where: this.visible(), transaction })) || 0) + 1;
    const category = await Category.create({
      name: source.name, color: source.color, ...defined({ description: source.description, icon: source.icon }), order, isActive: source.isActive ?? true, userId: this.userId,
    }, { transaction });
    this.result.created.categories++;
    return category.id;
  }

  private async category(sourceId: number) {
    const known = this.categories.get(sourceId);
    if (known !== undefined) return known;
    const reference = this.references.categories.get(sourceId);
    if (!reference) fail(400, 'importInvalid');
    const id = await this.categoryNamed(reference);
    this.categories.set(sourceId, id);
    return id;
  }

  /** The person's own record with the name in the category, or a shared one there; otherwise a new personal record. */
  private async ownCourse(categoryId: number, source: CatalogSource): Promise<Placed> {
    const { transaction } = this;
    const existing = await Course.findOne({ where: { categoryId, name: source.name, [Op.or]: [{ userId: this.userId, isGlobal: false }, { isGlobal: true }] }, transaction });
    if (existing) {
      if (existing.isGlobal) this.result.matchedShared++;
      return { id: existing.id, writable: !existing.isGlobal };
    }
    const order = source.order ?? ((await Course.max<number, Course>('order', { where: { categoryId }, transaction })) || 0) + 1;
    const course = await Course.create({
      name: source.name, categoryId, color: source.color, ...defined({ description: source.description, icon: source.icon }), order, isActive: source.isActive ?? true, userId: this.userId, isGlobal: false,
    }, { transaction });
    this.result.created.courses++;
    return { id: course.id, writable: true };
  }

  /** A shared record from the other site: the same name in a same-named category, or the only shared record with the name. */
  private async sharedCourse(source: { name: string; color: string; categoryId: number }): Promise<Placed> {
    const { transaction } = this;
    const categoryName = this.references.categories.get(source.categoryId)?.name;
    let match = categoryName
      ? await Course.findOne({ where: { isGlobal: true, name: source.name }, include: [{ model: Category, as: 'category', where: { name: categoryName }, required: true }], transaction })
      : null;
    if (!match) {
      const candidates = await Course.findAll({ where: { isGlobal: true, name: source.name }, limit: 2, transaction });
      if (candidates.length === 1) match = candidates[0];
    }
    if (match) {
      this.result.matchedShared++;
      return { id: match.id, writable: false };
    }
    return this.ownCourse(await this.category(source.categoryId), source);
  }

  private async course(sourceId: number) {
    if (this.courses.has(sourceId)) return this.courses.get(sourceId) ?? null;
    const reference = this.references.courses.get(sourceId);
    const placed = reference ? await this.sharedCourse(reference) : null;
    this.courses.set(sourceId, placed);
    return placed;
  }

  /** A sub-record with the name in the placed record; a new one only in the person's own record. */
  private async placeTopic(course: Placed, source: Pick<SourceTopic, 'name' | 'estimatedTime' | 'difficulty'> & Partial<SourceTopic>) {
    const { transaction } = this;
    const existing = await Topic.findOne({ where: { courseId: course.id, name: source.name }, order: [['isActive', 'DESC']], transaction });
    if (existing) return { id: existing.id, courseId: course.id };
    if (!course.writable) return null;
    const taken = source.order !== undefined && await Topic.findOne({ where: { courseId: course.id, order: source.order, isActive: true }, transaction });
    const order = source.order !== undefined && !taken ? source.order : ((await Topic.max<number, Topic>('order', { where: { courseId: course.id }, transaction })) || 0) + 1;
    const topic = await Topic.create({
      name: source.name, courseId: course.id, ...defined({ description: source.description }), estimatedTime: source.estimatedTime,
      difficulty: source.difficulty, order, isActive: source.isActive ?? true,
    }, { transaction });
    this.result.created.topics++;
    return { id: topic.id, courseId: course.id };
  }

  private async topic(sourceId: number) {
    if (this.topics.has(sourceId)) return this.topics.get(sourceId) ?? null;
    const reference = this.references.topics.get(sourceId);
    const course = reference ? await this.course(reference.courseId) : null;
    const placed = reference && course ? await this.placeTopic(course, reference) : null;
    this.topics.set(sourceId, placed);
    return placed;
  }

  /** Where a session or routine belongs on this site; a link with nowhere to go is dropped and counted. */
  private async link(source: { courseId?: number | null | undefined; topicId?: number | null | undefined }) {
    const topic = source.topicId ? await this.topic(source.topicId) : null;
    const course = topic ? { id: topic.courseId } : source.courseId ? await this.course(source.courseId) : null;
    if ((source.topicId && !topic) || (source.courseId && !course)) this.result.unlinked++;
    return { courseId: course?.id ?? null, topicId: topic?.id ?? null };
  }

  async catalog() {
    for (const category of this.file.categories) this.categories.set(category.id, await this.categoryNamed(category));
    for (const course of this.file.courses) await this.placeOwnCourse(course);
  }

  private async placeOwnCourse(source: OwnCourse) {
    const placed = source.isGlobal ? await this.sharedCourse(source) : await this.ownCourse(await this.category(source.categoryId), source);
    this.courses.set(source.id, placed);
    for (const topic of source.topics) this.topics.set(topic.id, await this.placeTopic(placed, topic));
  }

  async plans() {
    const created = await Plan.bulkCreate(this.file.plans.map(plan => ({
      userId: this.userId, title: plan.title, ...defined({ description: plan.description }),
      startDate: new Date(plan.startDate), endDate: new Date(plan.endDate), isActive: plan.isActive, goals: plan.goals,
    })), { transaction: this.transaction });
    this.result.created.plans = created.length;
    return new Map(this.file.plans.map((plan, index) => [plan.id, created[index].id]));
  }

  async routines() {
    const routines = new Map<number, number>();
    for (const routine of this.file.routines) {
      const created = await SessionSeries.create({
        userId: this.userId, title: routine.title, description: routine.description ?? null, ...await this.link(routine),
        sessionType: routine.sessionType, color: routine.color ?? null, pomodoroSettings: routine.pomodoroSettings ?? null,
        weekdays: routine.weekdays, startTime: routine.startTime, durationMinutes: routine.durationMinutes,
        startsOn: routine.startsOn, endsOn: routine.endsOn ?? null, timezone: routine.timezone,
        generatedThrough: routine.generatedThrough ?? null, exceptionDates: routine.exceptionDates,
      }, { transaction: this.transaction });
      routines.set(routine.id, created.id);
    }
    this.result.created.routines = routines.size;
    return routines;
  }

  /**
   * Sessions keep their measured intervals. One that was running or paused at export comes back paused from the export
   * moment, so nothing keeps counting across the move and only one session can ever be running.
   */
  async sessions(plans: Map<number, number>, routines: Map<number, number>, cutoff: Date) {
    const rows = [];
    for (const session of this.file.sessions) {
      const planId = session.planId ? plans.get(session.planId) ?? null : null;
      if (session.planId && !planId) this.result.unlinked++;
      const seriesId = session.seriesId ? routines.get(session.seriesId) ?? null : null;
      rows.push({
        userId: this.userId, planId, ...await this.link(session), seriesId, seriesDate: seriesId ? session.seriesDate ?? null : null,
        title: session.title, startTime: new Date(session.startTime), endTime: new Date(session.endTime),
        duration: session.duration, trackingCoverage: session.trackingCoverage, status: isActive(session) ? 'paused' as const : session.status,
        sessionType: session.sessionType,
        ...defined({ description: session.description, color: session.color, pomodoroSettings: session.pomodoroSettings, notes: session.notes, productivity: session.productivity }),
        completedAt: session.completedAt ? new Date(session.completedAt) : null,
      });
    }
    const created = await inChunks(rows, part => StudySession.bulkCreate(part, { transaction: this.transaction }));
    this.result.created.sessions = created.length;
    const sessions = new Map(this.file.sessions.map((session, index) => [session.id, created[index].id]));
    const intervals = this.file.sessions.flatMap((session, index) => measuredIntervals(session, created[index].id, cutoff));
    await inChunks(intervals, part => SessionInterval.bulkCreate(part, { transaction: this.transaction }));
    return sessions;
  }

  async goalsAndProgress() {
    const { transaction } = this;
    const goals = new Map<number, number>();
    for (const goal of this.file.courseGoals) {
      const course = await this.course(goal.courseId);
      if (!course) this.result.unlinked++;
      else if (!goals.has(course.id)) goals.set(course.id, goal.weeklyMinutes);
    }
    await CourseGoal.bulkCreate([...goals].map(([courseId, weeklyMinutes]) => ({ userId: this.userId, courseId, weeklyMinutes })), { transaction });
    this.result.created.courseGoals = goals.size;
    const progress = new Map<number, 'in_progress' | 'completed'>();
    for (const row of this.file.topicProgress) {
      const topic = await this.topic(row.topicId);
      if (!topic) this.result.unlinked++;
      else if (!progress.has(topic.id)) progress.set(topic.id, row.status);
    }
    await UserTopicProgress.bulkCreate([...progress].map(([topicId, status]) => ({ userId: this.userId, topicId, status })), { transaction });
    this.result.created.topicProgress = progress.size;
  }

  async tags(sessions: Map<number, number>) {
    const { transaction } = this;
    const byKey = new Map<string, number>();
    const tags = new Map<number, number>();
    for (const tag of this.file.tags.tags) {
      const key = foldSearchText(tag.name);
      let id = byKey.get(key);
      if (id === undefined) {
        id = (await Tag.create({ userId: this.userId, name: tag.name, nameKey: key }, { transaction })).id;
        byKey.set(key, id);
      }
      tags.set(tag.id, id);
    }
    this.result.created.tags = byKey.size;
    const courseTags = new Map<string, { tagId: number; courseId: number }>();
    for (const row of this.file.tags.courseTags) {
      const tagId = tags.get(row.tagId);
      const course = await this.course(row.courseId);
      if (!tagId || !course) { this.result.unlinked++; continue; }
      courseTags.set(`${tagId}:${course.id}`, { tagId, courseId: course.id });
    }
    await CourseTag.bulkCreate([...courseTags.values()], { transaction });
    const sessionTags = new Map<string, { tagId: number; sessionId: number }>();
    for (const row of this.file.tags.sessionTags) {
      const tagId = tags.get(row.tagId);
      const sessionId = sessions.get(row.sessionId);
      if (!tagId || !sessionId) { this.result.unlinked++; continue; }
      sessionTags.set(`${tagId}:${sessionId}`, { tagId, sessionId });
    }
    await inChunks([...sessionTags.values()], part => SessionTag.bulkCreate(part, { transaction }));
  }
}

const isActive = (session: SessionRow) => session.status === 'in_progress' || session.status === 'paused';

function measuredIntervals(session: SessionRow, sessionId: number, cutoff: Date) {
  const intervals = session.activityIntervals.map(interval => ({ sessionId, kind: interval.kind, startedAt: new Date(interval.startedAt), endedAt: interval.endedAt ? new Date(interval.endedAt) : null }));
  const open = intervals.filter(interval => !interval.endedAt);
  // A pause still open at export simply continues; any other open interval ends at the export moment.
  const keepOpen = isActive(session) && open.length === 1 && open[0].kind === 'pause' ? open[0] : null;
  for (const interval of open) {
    if (interval !== keepOpen) interval.endedAt = new Date(Math.max(cutoff.getTime(), interval.startedAt.getTime()));
  }
  if (isActive(session) && !keepOpen) {
    const fence = intervals.reduce((latest, interval) => Math.max(latest, interval.endedAt?.getTime() ?? interval.startedAt.getTime()), cutoff.getTime());
    intervals.push({ sessionId, kind: 'pause', startedAt: new Date(fence), endedAt: null });
  }
  return intervals;
}

/** Fills an empty account from an export in one transaction, then brings its routines up to the horizon. */
export async function importAccount(userId: number, file: AccountImport): Promise<{ user: User; result: AccountImportResult }> {
  const cutoff = new Date(Math.min(Date.now(), new Date(file.exportedAt).getTime()));
  const outcome = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const user = await User.findByPk(userId, { transaction });
    if (!user?.isActive) fail(404, 'userNotFound');
    await assertEmpty(userId, transaction);
    const importer = new AccountImporter(userId, file, transaction);
    await importer.catalog();
    const plans = await importer.plans();
    const routines = await importer.routines();
    const sessions = await importer.sessions(plans, routines, cutoff);
    await importer.goalsAndProgress();
    await importer.tags(sessions);
    const preferences = preferencesSchema.safeParse(file.account.preferences);
    user.preferences = preferences.success ? { ...preferences.data, onboarding: 'done' } : mergePreferences(user.preferences, { onboarding: 'done' });
    importer.result.preferences = preferences.success ? 'imported' : 'skipped';
    await user.save({ transaction });
    return { user, result: importer.result };
  });
  await extendAllSeries(new Date(Date.now()), { userId });
  return outcome;
}
