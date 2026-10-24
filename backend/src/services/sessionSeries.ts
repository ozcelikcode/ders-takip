import { Op, Transaction, type WhereOptions } from 'sequelize';
import {
  addDateDays,
  dateKeyInZone,
  fail,
  routineOccurrenceInstant,
  seriesHorizonDays,
  type CreateSeriesInput,
  type SeriesRecord,
  type UpdateSeriesInput,
} from '@study-tracker/contracts';
import { sequelize } from '../config/database';
import { SessionInterval, SessionSeries, StudySession } from '../models';
import { validateRelations } from './studySessions';

interface Actor { id: number; role: string }

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const earlier = (a: string, b: string | null) => (b !== null && b < a ? b : a);
const later = (a: string, b: string) => (b > a ? b : a);
/** The last routine date that should exist as a session now: the horizon, or the routine's end if sooner. */
const horizonFor = (series: SessionSeries, now: Date) => earlier(addDateDays(dateKeyInZone(now, series.timezone), seriesHorizonDays), series.endsOn);

export const seriesDTO = (series: SessionSeries): SeriesRecord => ({
  id: series.id,
  title: series.title,
  description: series.description ?? null,
  courseId: series.courseId ?? null,
  topicId: series.topicId ?? null,
  sessionType: series.sessionType,
  color: series.color ?? null,
  pomodoroSettings: series.pomodoroSettings ?? null,
  weekdays: series.weekdays,
  startTime: series.startTime,
  durationMinutes: series.durationMinutes,
  startsOn: series.startsOn,
  endsOn: series.endsOn ?? null,
  timezone: series.timezone,
  updatedAt: series.updatedAt.toISOString(),
});

/**
 * Creates the routine's sessions for routine dates `from`…`through`. A date is left out when the person
 * changed or removed it before, when it already has its session, when it is already over, or when another
 * session holds that time; the last ones are returned so the person can be told.
 */
async function materialize(series: SessionSeries, from: string, through: string, now: Date, transaction: Transaction): Promise<string[]> {
  const first = later(from, series.startsOn);
  const last = earlier(through, series.endsOn);
  if (first > last) return [];
  const occurrences: { date: string; startTime: Date; endTime: Date }[] = [];
  for (let date = first; date <= last; date = addDateDays(date, 1)) {
    if (!series.weekdays.includes(weekday(date)) || series.exceptionDates.includes(date)) continue;
    const startTime = routineOccurrenceInstant(date, series.startTime, series.timezone);
    const endTime = new Date(startTime.getTime() + series.durationMinutes * 60_000);
    if (endTime > now) occurrences.push({ date, startTime, endTime });
  }
  if (!occurrences.length) return [];
  const existing = await StudySession.findAll({
    where: {
      userId: series.userId,
      [Op.or]: [
        { seriesId: series.id, seriesDate: { [Op.between]: [first, last] } },
        { status: { [Op.ne]: 'cancelled' }, startTime: { [Op.lt]: occurrences[occurrences.length - 1]!.endTime }, endTime: { [Op.gt]: occurrences[0]!.startTime } },
      ],
    },
    attributes: ['seriesId', 'seriesDate', 'status', 'startTime', 'endTime'],
    transaction,
  });
  const taken = new Set(existing.filter((session) => session.seriesId === series.id).map((session) => session.seriesDate));
  const busy = existing.filter((session) => session.status !== 'cancelled').map(({ startTime, endTime }) => ({ startTime, endTime }));
  const skipped: string[] = [];
  for (const occurrence of occurrences) {
    if (taken.has(occurrence.date)) continue;
    if (busy.some((other) => other.startTime < occurrence.endTime && other.endTime > occurrence.startTime)) {
      skipped.push(occurrence.date);
      continue;
    }
    await StudySession.create({
      userId: series.userId,
      title: series.title,
      ...(series.description ? { description: series.description } : {}),
      courseId: series.courseId,
      topicId: series.topicId,
      sessionType: series.sessionType,
      ...(series.color ? { color: series.color } : {}),
      ...(series.pomodoroSettings ? { pomodoroSettings: series.pomodoroSettings } : {}),
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      duration: series.durationMinutes,
      seriesId: series.id,
      seriesDate: occurrence.date,
    }, { transaction });
    busy.push(occurrence);
  }
  return skipped;
}

/** Removes the routine's future sessions that nobody touched: still planned, never measured, not changed one by one. */
async function removeUntouchedFuture(series: SessionSeries, now: Date, transaction: Transaction) {
  const sessions = await StudySession.findAll({
    where: { seriesId: series.id, status: 'planned', startTime: { [Op.gte]: now } },
    include: [{ model: SessionInterval, as: 'activityIntervals', attributes: ['id'] }],
    transaction,
  });
  const untouched = sessions.filter((session) => !session.activityIntervals?.length && !series.exceptionDates.includes(session.seriesDate ?? ''));
  if (untouched.length) await StudySession.destroy({ where: { id: { [Op.in]: untouched.map((session) => session.id) } }, transaction });
}

async function loadOwned(actor: Actor, id: number, expectedUpdatedAt: string, transaction: Transaction) {
  const series = await SessionSeries.findOne({ where: { id, userId: actor.id }, transaction });
  if (!series) fail(404, 'recordNotFound');
  if (series.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) fail(409, 'seriesChanged');
  return series;
}

const definition = (input: CreateSeriesInput, courseId: number | undefined, timezone: string) => ({
  title: input.title,
  description: input.description ?? null,
  courseId: courseId ?? null,
  topicId: input.topicId ?? null,
  sessionType: input.sessionType ?? 'study',
  color: input.color ?? null,
  pomodoroSettings: input.pomodoroSettings ?? null,
  weekdays: [...input.weekdays].sort((a, b) => a - b),
  startTime: input.startTime,
  durationMinutes: input.durationMinutes,
  startsOn: input.startsOn,
  endsOn: input.endsOn ?? null,
  timezone,
});

export const listSeries = (actor: Actor) => SessionSeries.findAll({ where: { userId: actor.id }, order: [['createdAt', 'ASC']] });

/** Creates a routine in the owner's time zone and its sessions up to the horizon. */
export async function createSeries(actor: Actor, input: CreateSeriesInput, timezone: string) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const courseId = await validateRelations(actor, { courseId: input.courseId, topicId: input.topicId }, transaction);
    const series = await SessionSeries.create({ userId: actor.id, ...definition(input, courseId, timezone), exceptionDates: [] }, { transaction });
    const now = new Date(Date.now());
    const through = horizonFor(series, now);
    const skippedDates = await materialize(series, dateKeyInZone(now, timezone), through, now, transaction);
    series.generatedThrough = through;
    await series.save({ transaction });
    return { series, skippedDates };
  });
}

/** Replaces the definition and rebuilds the future sessions nobody touched; past, started and changed ones stay. */
export async function updateSeries(actor: Actor, id: number, input: UpdateSeriesInput, timezone: string) {
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const series = await loadOwned(actor, id, input.expectedUpdatedAt, transaction);
    const courseId = await validateRelations(actor, { courseId: input.courseId, topicId: input.topicId }, transaction, { courseId: series.courseId, topicId: series.topicId });
    const now = new Date(Date.now());
    await removeUntouchedFuture(series, now, transaction);
    series.set(definition(input, courseId, timezone));
    const through = horizonFor(series, now);
    const skippedDates = await materialize(series, dateKeyInZone(now, timezone), through, now, transaction);
    series.generatedThrough = through;
    await series.save({ transaction });
    return { series, skippedDates };
  });
}

/** Ends a routine: its untouched future sessions go, everything else stays as ordinary sessions. */
export async function stopSeries(actor: Actor, id: number, expectedUpdatedAt: string) {
  await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
    const series = await loadOwned(actor, id, expectedUpdatedAt, transaction);
    await removeUntouchedFuture(series, new Date(Date.now()), transaction);
    await StudySession.update({ seriesId: null, seriesDate: null }, { where: { seriesId: series.id }, transaction });
    await series.destroy({ transaction });
  });
}

/** Daily: brings every routine's sessions (or those matching `where`) up to the horizon. Returns how many routine dates were skipped for conflicts. */
export async function extendAllSeries(now = new Date(Date.now()), where: WhereOptions<SessionSeries> = {}): Promise<number> {
  let skipped = 0;
  for (const { id } of await SessionSeries.findAll({ attributes: ['id'], where })) {
    skipped += await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
      const series = await SessionSeries.findByPk(id, { transaction });
      if (!series) return 0;
      const through = horizonFor(series, now);
      if (series.generatedThrough && series.generatedThrough >= through) return 0;
      const from = series.generatedThrough ? addDateDays(series.generatedThrough, 1) : dateKeyInZone(now, series.timezone);
      const dates = await materialize(series, from, through, now, transaction);
      series.generatedThrough = through;
      await series.save({ transaction, silent: true });
      return dates.length;
    });
  }
  return skipped;
}
