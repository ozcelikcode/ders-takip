import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { addDateDays, dayBounds, type ActivityKind, type SessionQuery, type SessionStats, type StudyTotals, type SessionStatus, type UserStudySummary } from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { SessionInterval, StudySession, PomodoroClock } from '../models';

const emptyTotals = (): StudyTotals => ({ studySeconds: 0, breakSeconds: 0, pauseSeconds: 0 });
const totalKey = (kind: SessionInterval['kind']) => kind === 'study' ? 'studySeconds' : kind === 'break' ? 'breakSeconds' : 'pauseSeconds';

export async function recordActivity(session: StudySession, nextStatus: SessionStatus, activityKind: ActivityKind | undefined, transaction: Transaction, at = new Date(Date.now())) {
  if (nextStatus === session.status && activityKind === undefined) return;
  if (activityKind !== undefined && nextStatus !== 'in_progress') throw Object.assign(new Error('Etkinlik türü yalnız çalışan seansta değiştirilebilir'), { statusCode: 409 });
  const intervals = await SessionInterval.findAll({ where: { sessionId: session.id }, order: [['startedAt', 'ASC'], ['id', 'ASC']], transaction });
  const open = intervals.find(interval => !interval.endedAt);
  const lastActive = [...intervals].reverse().find(interval => interval.kind !== 'pause');
  const kind = nextStatus === 'in_progress' ? (session.sessionType === 'break' ? 'break' : activityKind ?? lastActive?.kind ?? 'study') : nextStatus === 'paused' ? 'pause' : null;
  if (open?.kind === kind) return;
  const fence = intervals.reduce((latest, interval) => Math.max(latest, interval.endedAt?.getTime() ?? interval.startedAt.getTime()), 0);
  const now = new Date(Math.max(at.getTime(), fence));
  if (open) await open.update({ endedAt: now }, { transaction });
  if (kind) await SessionInterval.create({ sessionId: session.id, kind, startedAt: now }, { transaction });
  if (session.trackingCoverage === 'untracked' && kind) session.trackingCoverage = 'partial';
  // A phase-only change must advance the session's optimistic version too.
  if (open || kind) session.changed('trackingCoverage', true);
  return now;
}

function measuredTotals(intervals: readonly SessionInterval[], asOf: Date, start = -Infinity, end = Infinity, deadline?: Date | null): StudyTotals {
  const totals = emptyTotals();
  for (const interval of intervals) {
    const openEnd = !interval.endedAt && interval.kind !== 'pause' && deadline ? Math.min(asOf.getTime(), deadline.getTime()) : asOf.getTime();
    const milliseconds = Math.max(0, Math.min(interval.endedAt?.getTime() ?? openEnd, end) - Math.max(interval.startedAt.getTime(), start));
    totals[totalKey(interval.kind)] += milliseconds / 1000;
  }
  return totals;
}
export function sessionDTO(session: StudySession, asOf = new Date(Date.now())) {
  const intervals = session.activityIntervals ?? [];
  const observedAt = new Date(intervals.reduce((value, interval) => Math.max(value, interval.endedAt?.getTime() ?? interval.startedAt.getTime()), asOf.getTime()));
  return { ...session.toJSON(), ...measuredTotals(intervals, observedAt, -Infinity, Infinity, session.pomodoroClock?.deadlineAt), asOf: observedAt.toISOString(), serverNow: new Date(Date.now()).toISOString() };
}

export async function getStudyStats(userId: number, timezone: string, query: SessionQuery): Promise<SessionStats> {
  if (!!query.startDate !== !!query.endDate) throw Object.assign(new Error('İstatistik için başlangıç ve bitiş günü birlikte gereklidir'), { statusCode: 400 });
  const days: SessionStats['days'] = [];
  if (query.startDate && query.endDate) {
    for (let date = query.startDate; date <= query.endDate; date = addDateDays(date, 1)) {
      if (days.length >= 366) throw Object.assign(new Error('İstatistik aralığı en fazla 366 gün olabilir'), { statusCode: 400 });
      days.push({ date, ...emptyTotals() });
    }
  }
  const start = query.startDate ? dayBounds(query.startDate, timezone).start.getTime() : -Infinity;
  const end = query.endDate ? dayBounds(query.endDate, timezone).end.getTime() : Infinity;
  const boundsByDay = days.map(day => dayBounds(day.date, timezone));
  return sequelize.transaction(async transaction => {
    const where: WhereOptions = { userId, ...(query.planId === undefined ? {} : { planId: query.planId }), ...(query.sessionType === undefined ? {} : { sessionType: query.sessionType }), ...(query.status === undefined ? {} : { status: query.status }) };
    const sessions = await StudySession.findAll({ where, include: [{ model: SessionInterval, as: 'activityIntervals' }, { model: PomodoroClock, as: 'pomodoroClock' }], transaction });
    const asOf = new Date(sessions.reduce((value, session) => (session.activityIntervals ?? []).reduce((latest, interval) => Math.max(latest, interval.endedAt?.getTime() ?? interval.startedAt.getTime()), value), Date.now()));
    const result: SessionStats = { ...emptyTotals(), days, asOf: asOf.toISOString(), timezone, totalSessions: 0, lastActivity: null, completedSessions: 0, partialSessions: 0, untrackedSessions: 0 };
    for (const session of sessions) {
      const intervals = session.activityIntervals ?? [];
      const total = measuredTotals(intervals, asOf, start, end, session.pomodoroClock?.deadlineAt);
      for (const key of ['studySeconds', 'breakSeconds', 'pauseSeconds'] as const) result[key] += total[key];
      for (const [index, day] of days.entries()) {
        const bounds = boundsByDay[index]!;
        const daily = measuredTotals(intervals, asOf, bounds.start.getTime(), bounds.end.getTime(), session.pomodoroClock?.deadlineAt);
        day.studySeconds += daily.studySeconds; day.breakSeconds += daily.breakSeconds; day.pauseSeconds += daily.pauseSeconds;
      }
      const completion = session.completedAt ?? session.endTime;
      if (session.status === 'completed' && completion.getTime() >= start && completion.getTime() < end) result.completedSessions++;
      const inScope = session.startTime.getTime() < end && session.endTime.getTime() > start || Object.values(total).some(value => value > 0);
      if (inScope) {
        result.totalSessions++;
        const activity = [...intervals.map(interval => (interval.endedAt ?? interval.startedAt).getTime()), session.createdAt.getTime()];
        const latest = new Date(Math.max(...activity)).toISOString();
        if (!result.lastActivity || latest > result.lastActivity) result.lastActivity = latest;
      }
      if (inScope && session.trackingCoverage === 'untracked') result.untrackedSessions++;
      if (inScope && session.trackingCoverage === 'partial') result.partialSessions++;
    }
    return result;
  });
}

/** All-time measured summaries for several users from a single query; omit userIds to cover every user. */
export async function getAllTimeSummaries(userIds?: readonly number[]): Promise<Map<number, UserStudySummary>> {
  const sessions = await StudySession.findAll({
    ...(userIds ? { where: { userId: { [Op.in]: [...userIds] } } } : {}),
    include: [{ model: SessionInterval, as: 'activityIntervals' }, { model: PomodoroClock, as: 'pomodoroClock' }],
  });
  const asOf = new Date(sessions.reduce((value, session) => (session.activityIntervals ?? []).reduce((latest, interval) => Math.max(latest, interval.endedAt?.getTime() ?? interval.startedAt.getTime()), value), Date.now()));
  const summaries = new Map<number, UserStudySummary>((userIds ?? []).map(id => [id, { totalSessions: 0, completedSessions: 0, studySeconds: 0, lastActivity: null }]));
  for (const session of sessions) {
    const summary = summaries.get(session.userId) ?? { totalSessions: 0, completedSessions: 0, studySeconds: 0, lastActivity: null };
    const intervals = session.activityIntervals ?? [];
    summary.totalSessions++;
    if (session.status === 'completed') summary.completedSessions++;
    summary.studySeconds += measuredTotals(intervals, asOf, -Infinity, Infinity, session.pomodoroClock?.deadlineAt).studySeconds;
    const latest = new Date(Math.max(session.createdAt.getTime(), ...intervals.map(interval => (interval.endedAt ?? interval.startedAt).getTime()))).toISOString();
    if (!summary.lastActivity || latest > summary.lastActivity) summary.lastActivity = latest;
    summaries.set(session.userId, summary);
  }
  return summaries;
}

export function scheduledRange(query: SessionQuery, timezone: string): WhereOptions {
  const where: WhereOptions = {};
  if (query.startDate) where.endTime = { [Op.gt]: dayBounds(query.startDate, timezone).start };
  if (query.endDate) where.startTime = { [Op.lt]: dayBounds(query.endDate, timezone).end };
  return where;
}

export const sessionTimezone = (actor: { preferences?: { timezone?: string } }, query: SessionQuery) => query.timezone ?? actor.preferences?.timezone ?? 'Europe/Istanbul';
