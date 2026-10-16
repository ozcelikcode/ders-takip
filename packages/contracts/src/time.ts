import { DateTime } from 'luxon';
import { z } from 'zod';

export class CalendarTimeError extends RangeError {}

export const timezoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
});
export const calendarDateSchema = z.iso.date();
export const dateKeyInZone = (instant: Date | string | number, timezone: string): string => {
  const date = DateTime.fromMillis(new Date(instant).getTime(), { zone: timezone });
  if (!date.isValid) throw new CalendarTimeError('Invalid instant or timezone');
  return date.toISODate()!;
};
export const addDateDays = (date: string, days: number) => DateTime.fromISO(calendarDateSchema.parse(date), { zone: 'UTC' }).plus({ days }).toISODate()!;
export const weekStartDate = (date: string) => DateTime.fromISO(calendarDateSchema.parse(date), { zone: 'UTC' }).startOf('week').toISODate()!;
export const dayBounds = (date: string, timezone: string) => {
  const start = DateTime.fromISO(calendarDateSchema.parse(date), { zone: timezone }).startOf('day');
  if (!start.isValid || start.toISODate() !== date) throw new CalendarTimeError('Invalid calendar day in timezone');
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).startOf('day').toJSDate() };
};
export const wallTimeToInstant = (date: string, time: string, timezone: string): Date => {
  const value = `${calendarDateSchema.parse(date)}T${time}`;
  const parsed = DateTime.fromISO(value, { zone: timezone });
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time) || !parsed.isValid || parsed.toFormat(time.length === 5 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd'T'HH:mm:ss") !== value || parsed.getPossibleOffsets().length !== 1) {
    throw new CalendarTimeError('The selected wall time is missing or ambiguous in this timezone');
  }
  return parsed.toJSDate();
};
export const formatZonedTime = (instant: Date | string, timezone: string) => new Intl.DateTimeFormat('tr-TR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant));

// Synthetic UTC dates keep wall-clock fields independent of the browser's own DST rules.
export class CalendarDate extends Date {
  override getFullYear() { return this.getUTCFullYear(); }
  override getMonth() { return this.getUTCMonth(); }
  override getDate() { return this.getUTCDate(); }
  override getDay() { return this.getUTCDay(); }
  override getHours() { return this.getUTCHours(); }
  override getMinutes() { return this.getUTCMinutes(); }
  override getSeconds() { return this.getUTCSeconds(); }
  override getMilliseconds() { return this.getUTCMilliseconds(); }
  override setHours(hours: number, minutes = this.getMinutes(), seconds = this.getSeconds(), milliseconds = this.getMilliseconds()) { return this.setUTCHours(hours, minutes, seconds, milliseconds); }
  override setMinutes(minutes: number, seconds = this.getSeconds(), milliseconds = this.getMilliseconds()) { return this.setUTCMinutes(minutes, seconds, milliseconds); }
}
// These adapter dates are calendar fields, never instants for persistence or duration math.
export const calendarViewDate = (instant: Date | string, timezone: string): Date => {
  const date = DateTime.fromMillis(new Date(instant).getTime(), { zone: timezone });
  return new CalendarDate(Date.UTC(date.year, date.month - 1, date.day, date.hour, date.minute, date.second, date.millisecond));
};
export const calendarViewInstant = (view: Date, timezone: string) => new Date(wallTimeToInstant(
  `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(view.getDate()).padStart(2, '0')}`,
  `${String(view.getHours()).padStart(2, '0')}:${String(view.getMinutes()).padStart(2, '0')}:${String(view.getSeconds()).padStart(2, '0')}`, timezone,
).getTime() + view.getMilliseconds());
