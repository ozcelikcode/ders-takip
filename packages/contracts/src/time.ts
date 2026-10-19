import { z } from 'zod';

// Schemas and pure helpers only: bundles that validate payloads must not pull in luxon.
// Zone arithmetic lives in zonedTime.ts.
export class CalendarTimeError extends RangeError {}

export const timezoneSchema = z.string().max(100).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
});
export const calendarDateSchema = z.iso.date();
/** First weekday of a week as a JS day number: 1 Monday (ISO), 0 Sunday, 6 Saturday. */
export const weekStartDays = [1, 0, 6] as const;
export const weekStartSchema = z.union([z.literal(1), z.literal(0), z.literal(6)]);
export type WeekStart = z.infer<typeof weekStartSchema>;
export const defaultWeekStart: WeekStart = 1;
/** Days to step back from a JS weekday (0 = Sunday) to reach the configured week start. */
export const daysSinceWeekStart = (jsWeekday: number, weekStart: WeekStart) => (jsWeekday - weekStart + 7) % 7;
/** Local calendar day (YYYY-MM-DD) of an instant in a time zone, using only Intl. */
export const dateKeyInZone = (instant: Date | string | number, timezone: string): string => {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) throw new CalendarTimeError('Invalid instant or timezone');
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  } catch {
    throw new CalendarTimeError('Invalid instant or timezone');
  }
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
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
