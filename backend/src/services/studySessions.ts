import { Op, Transaction, type Includeable } from 'sequelize';
import { canTransitionSession, reservesSessionTime, type CreateSessionInput, type UpdateSessionInput, type PomodoroCommand } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { Category, Course, Plan, StudySession, Topic, SessionInterval, PomodoroClock } from '../models';
import { createPomodoroClock, settlePomodoroClock, updatePomodoroClock, savePomodoroClock } from './pomodoroClocks';
import { recordActivity } from './studyTracking';
import { visibleCourseWhere } from '../policies/courseAccess';

interface Actor { id: number; role: string }
export const sessionIncludes: Includeable[] = [
  { model: PomodoroClock, as: 'pomodoroClock' },
  { model: SessionInterval, as: 'activityIntervals' },
  { model: Plan, as: 'plan', attributes: ['id', 'title'] },
  { model: Course, as: 'course', attributes: ['id', 'name', 'color', 'icon'], include: [
    { model: Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'] },
  ] },
  { model: Topic, as: 'topic', attributes: ['id', 'name', 'difficulty'] },
];

function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}

function scheduledDuration(start: Date, end: Date): number {
  const milliseconds = end.getTime() - start.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 60_000 || milliseconds > 86_400_000) {
    fail(400, 'Seans bitişi başlangıcından sonra olmalı; süre 1 dakika ile 24 saat arasında olmalıdır');
  }
  return Math.round(milliseconds / 60_000);
}

async function validateRelations(
  actor: Actor,
  values: { planId?: number | undefined; courseId?: number | undefined; topicId?: number | undefined },
  transaction: Transaction,
  existing?: { courseId?: number | null | undefined; topicId?: number | null | undefined },
) {
  if (values.planId !== undefined && !await Plan.findOne({ where: { id: values.planId, userId: actor.id }, transaction })) {
    fail(400, 'Geçersiz plan ID');
  }
  let courseId = values.courseId;
  if (values.topicId !== undefined) {
    const requireActiveTopic = existing?.topicId !== values.topicId;
    const requireActiveCourse = requireActiveTopic || (courseId !== undefined && existing?.courseId !== courseId);
    const topic = await Topic.findOne({
      where: { id: values.topicId, ...(requireActiveTopic ? { isActive: true } : {}) },
      include: [
        { model: Course, as: 'course', required: true, where: { ...visibleCourseWhere(actor), ...(requireActiveCourse ? { isActive: true } : {}) } },
      ],
      transaction,
    });
    if (!topic || (courseId !== undefined && courseId !== topic.courseId)) fail(400, 'Geçersiz ders veya konu seçimi');
    courseId = topic.courseId;
  }
  if (courseId !== undefined) {
    const requireActiveCourse = existing?.courseId !== courseId;
    if (!await Course.findOne({ where: { ...visibleCourseWhere(actor), id: courseId, ...(requireActiveCourse ? { isActive: true } : {}) }, transaction })) {
      fail(400, 'Geçersiz ders veya konu seçimi');
    }
  }
  return courseId;
}

async function assertAvailable(userId: number, startTime: Date, endTime: Date, transaction: Transaction, excludeId?: number) {
  const conflict = await StudySession.findOne({ where: {
    userId, status: { [Op.ne]: 'cancelled' },
    ...(excludeId === undefined ? {} : { id: { [Op.ne]: excludeId } }),
    startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime },
  }, transaction });
  if (conflict) fail(409, 'Bu zaman aralığında başka bir çalışma seansı mevcut');
}

async function loadOwned(actor: Actor, id: number, expectedUpdatedAt: string, transaction: Transaction) {
  const session = await StudySession.findOne({ where: { id, userId: actor.id }, transaction });
  if (!session) fail(404, 'Çalışma seansı bulunamadı');
  if (session.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
    fail(409, 'Seans başka bir işlemde değiştirildi. Güncel veriyi yükleyip tekrar deneyin');
  }
  return session;
}

export async function createSession(actor: Actor, input: CreateSessionInput) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    const duration = scheduledDuration(startTime, endTime);
    const courseId = await validateRelations(actor, input, transaction);
    await assertAvailable(actor.id, startTime, endTime, transaction);
    const session = StudySession.build({ userId: actor.id, title: input.title, startTime, endTime, duration, sessionType: input.sessionType ?? 'study' });
    for (const field of ['planId', 'topicId', 'description', 'color', 'pomodoroSettings'] as const) {
      if (input[field] !== undefined) session.set(field, input[field]);
    }
    if (courseId !== undefined) session.courseId = courseId;
    await session.save({ transaction });
    return session.reload({ include: sessionIncludes, transaction });
  });
}

export async function updateSession(actor: Actor, id: number, input: UpdateSessionInput, timerCommand?: PomodoroCommand) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const session = await loadOwned(actor, id, input.expectedUpdatedAt, transaction);
    let clock = await PomodoroClock.findByPk(id, { transaction });
    if (timerCommand && session.sessionType !== 'pomodoro') fail(409, 'Bu seans Pomodoro türünde değil');
    if (clock) await settlePomodoroClock(session, clock, transaction);
    if (input.sessionType && input.sessionType !== session.sessionType && clock) {
      if ((input.status ?? session.status) !== 'planned') fail(409, 'Sayaç türünü değiştirmeden önce seansı sıfırlayın');
      await clock.destroy({ transaction }); clock = null;
    }
    const nextStatus = input.status ?? session.status;
    if (timerCommand?.command === 'configure' && (session.status === 'completed' || session.status === 'cancelled')) fail(409, 'Tamamlanan veya iptal edilen sayaç değiştirilemez');
    if (clock && input.pomodoroSettings && (session.status !== 'planned' || nextStatus !== 'planned')) fail(409, 'Süreleri değiştirmeden önce sayacı sıfırlayın');
    if (!canTransitionSession(session.status, nextStatus)) fail(409, 'Bu seans durum geçişine izin verilmiyor');
    const startTime = input.startTime === undefined ? session.startTime : new Date(input.startTime);
    const endTime = input.endTime === undefined ? session.endTime : new Date(input.endTime);
    const scheduleChanged = startTime.getTime() !== session.startTime.getTime() || endTime.getTime() !== session.endTime.getTime();
    const duration = scheduleChanged ? scheduledDuration(startTime, endTime) : session.duration;
    const reopening = session.status === 'cancelled' && nextStatus === 'planned';
    if ((scheduleChanged || reopening) && reservesSessionTime(nextStatus)) {
      await assertAvailable(actor.id, startTime, endTime, transaction, session.id);
    }
    if (nextStatus === 'in_progress' && session.status !== 'in_progress') {
      if (endTime.getTime() <= Date.now()) fail(409, 'Bu seansın planlanan bitişi geçmiş. Önce saatini güncelleyin');
      const active = await StudySession.findOne({ where: { userId: actor.id, status: 'in_progress', id: { [Op.ne]: id } }, transaction });
      if (active) fail(409, 'Önce devam eden seansı duraklatın veya tamamlayın');
    }
    if (input.planId !== undefined || input.courseId !== undefined || input.topicId !== undefined) {
      const nextPlanId = input.planId === undefined ? (session.planId ?? undefined) : (input.planId ?? undefined);
      const nextCourseId = input.courseId === undefined ? (session.courseId ?? undefined) : (input.courseId ?? undefined);
      const courseChanged = input.courseId !== undefined && input.courseId !== session.courseId;
      const nextTopicId = input.topicId === undefined
        ? (courseChanged ? undefined : (session.topicId ?? undefined))
        : (input.topicId ?? undefined);
      const resolvedCourseId = await validateRelations(
        actor,
        { planId: nextPlanId, courseId: nextCourseId, topicId: nextTopicId },
        transaction,
        { courseId: session.courseId, topicId: session.topicId },
      );
      session.planId = nextPlanId ?? null;
      session.topicId = nextTopicId ?? null;
      session.courseId = resolvedCourseId ?? null;
    }
    if (scheduleChanged) session.set({ startTime, endTime, duration });
    for (const field of ['title', 'description', 'notes', 'productivity', 'color', 'sessionType'] as const) {
      if (input[field] !== undefined) session.set(field, input[field]);
    }
    if (input.pomodoroSettings !== undefined) {
      session.set('pomodoroSettings', {
        workDuration: input.pomodoroSettings.workDuration ?? session.pomodoroSettings?.workDuration ?? 25,
        shortBreak: input.pomodoroSettings.shortBreak ?? session.pomodoroSettings?.shortBreak ?? 5,
        longBreak: input.pomodoroSettings.longBreak ?? session.pomodoroSettings?.longBreak ?? 15,
        cyclesBeforeLongBreak: input.pomodoroSettings.cyclesBeforeLongBreak ?? session.pomodoroSettings?.cyclesBeforeLongBreak ?? 4,
        currentCycle: input.pomodoroSettings.currentCycle ?? session.pomodoroSettings?.currentCycle ?? 0,
      });
    }
    if (!clock && session.sessionType === 'pomodoro' && (timerCommand || nextStatus === 'in_progress')) {
      clock = await createPomodoroClock(session, transaction);
      session.changed('trackingCoverage', true);
    }
    if (clock && input.activityKind !== undefined && input.activityKind !== (clock.phase === 'work' ? 'study' : 'break')) fail(409, 'Pomodoro fazını sayaç yönetir');
    const activityTime = await recordActivity(session, nextStatus, nextStatus === 'in_progress' && clock ? clock.phase === 'work' ? 'study' : 'break' : input.activityKind, transaction);
    if (clock) {
      if (timerCommand?.autoStartBreaks !== undefined) clock.autoStartBreaks = timerCommand.autoStartBreaks;
      updatePomodoroClock(session, clock, nextStatus, activityTime ?? new Date(Date.now()), timerCommand?.command === 'reset');
      await savePomodoroClock(session, clock, transaction);
    }
    if (nextStatus !== session.status) {
      session.completedAt = nextStatus === 'completed' ? activityTime ?? new Date(Date.now()) : null;
      session.status = nextStatus;
    }
    if (session.changed()) await session.save({ transaction });
    return session.reload({ include: sessionIncludes, transaction });
  });
}

export async function deleteSession(actor: Actor, id: number, expectedUpdatedAt: string) {
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const session = await loadOwned(actor, id, expectedUpdatedAt, transaction);
    await session.destroy({ transaction });
  });
}
