import { Op, Transaction } from 'sequelize';
import { defaultPomodoroSettings, phaseMilliseconds, type SessionStatus } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { PomodoroClock, StudySession } from '../models';
import { recordActivity } from './studyTracking';
import { withDatabaseActivity } from './databaseMaintenance';

const settingsFor = (session: StudySession) => session.pomodoroSettings ?? defaultPomodoroSettings;
export async function createPomodoroClock(session: StudySession, transaction: Transaction) {
  return PomodoroClock.create({ sessionId: session.id, phase: 'work', cycle: 1, remainingMilliseconds: phaseMilliseconds('work', settingsFor(session)) }, { transaction });
}
export async function settlePomodoroClock(session: StudySession, clock: PomodoroClock, transaction: Transaction, now = Date.now()) {
  while (clock.deadlineAt && clock.deadlineAt.getTime() <= now && session.status === 'in_progress') {
    const boundary = clock.deadlineAt;
    const settings = settingsFor(session);
    const finishedPhase = clock.phase;
    if (finishedPhase === 'work') {
      clock.completedWorkCycles++;
      clock.phase = clock.cycle >= settings.cyclesBeforeLongBreak ? 'long_break' : 'short_break';
    } else {
      clock.cycle = finishedPhase === 'long_break' ? 1 : clock.cycle + 1;
      clock.phase = 'work';
    }
    const automaticBreak = finishedPhase === 'work' && clock.autoStartBreaks;
    const nextStatus = automaticBreak ? 'in_progress' : 'paused';
    await recordActivity(session, nextStatus, automaticBreak ? 'break' : undefined, transaction, boundary);
    session.status = nextStatus;
    clock.remainingMilliseconds = phaseMilliseconds(clock.phase, settings);
    clock.deadlineAt = automaticBreak ? new Date(boundary.getTime() + clock.remainingMilliseconds) : null;
    session.changed('trackingCoverage', true);
  }
}
export function updatePomodoroClock(session: StudySession, clock: PomodoroClock, nextStatus: SessionStatus, now: Date, reset = false) {
  if (clock.deadlineAt && nextStatus !== 'in_progress') {
    clock.remainingMilliseconds = Math.max(0, Math.min(clock.remainingMilliseconds, clock.deadlineAt.getTime() - now.getTime()));
    clock.deadlineAt = null;
  }
  if (reset || nextStatus === 'planned') {
    clock.phase = 'work'; clock.cycle = 1; clock.completedWorkCycles = 0; clock.deadlineAt = null;
    clock.remainingMilliseconds = phaseMilliseconds('work', settingsFor(session));
  } else if (nextStatus === 'in_progress' && !clock.deadlineAt) {
    clock.deadlineAt = new Date(now.getTime() + clock.remainingMilliseconds);
  }
}
export async function savePomodoroClock(session: StudySession, clock: PomodoroClock, transaction: Transaction) {
  if (!clock.changed()) return;
  await clock.save({ transaction });
  session.changed('trackingCoverage', true);
}
export async function runDuePomodoros() {
  return withDatabaseActivity(async () => {
    const due = await PomodoroClock.findAll({ where: { deadlineAt: { [Op.lte]: new Date(Date.now()) } }, attributes: ['sessionId'], limit: 100, order: [['deadlineAt', 'ASC']] });
    let advanced = 0;
    for (const item of due) {
      await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
        const session = await StudySession.findByPk(item.sessionId, { transaction });
        const clock = await PomodoroClock.findByPk(item.sessionId, { transaction });
        if (!session || !clock || !clock.deadlineAt || clock.deadlineAt.getTime() > Date.now()) return;
        await settlePomodoroClock(session, clock, transaction);
        if (session.status !== 'in_progress') clock.deadlineAt = null;
        if (clock.changed()) { await savePomodoroClock(session, clock, transaction); await session.save({ transaction }); advanced++; }
      });
    }
    return advanced;
  });
}
export function startPomodoroScheduler() {
  let pending: Promise<unknown> | undefined;
  const timer = setInterval(() => {
    if (pending) return;
    pending = runDuePomodoros().catch(error => { console.error('Pomodoro scheduler failed:', { name: error instanceof Error ? error.name : 'UnknownError' }); }).finally(() => { pending = undefined; });
  }, 1000);
  timer.unref();
  return { stop: async () => { clearInterval(timer); await pending; } };
}
