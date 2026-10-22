import { CalendarDate, calendarViewDate, daysSinceWeekStart, defaultWeekStart, type WeekStart } from '@study-tracker/contracts';
import { DateTime } from 'luxon';
import { currentLocaleTag } from '../lib/locale';

const fromView = (date: Date) => DateTime.fromMillis(date.getTime(), { zone: 'UTC' });
export const format = (date: Date, pattern: string, _options?: unknown) => fromView(date).setLocale(currentLocaleTag()).toFormat(pattern.replace('EEEE', 'cccc'));
export const addDays = (date: Date, days: number) => new CalendarDate(fromView(date).plus({ days }).toMillis());
export const startOfWeek = (date: Date, weekStart: WeekStart = defaultWeekStart) => {
  const day = fromView(date).startOf('day');
  return new CalendarDate(day.minus({ days: daysSinceWeekStart(day.weekday % 7, weekStart) }).toMillis());
};
export const startOfMonth = (date: Date) => new CalendarDate(fromView(date).startOf('month').toMillis());
export const endOfMonth = (date: Date) => new CalendarDate(fromView(date).endOf('month').toMillis());
export const endOfWeek = (date: Date, weekStart: WeekStart = defaultWeekStart) =>
  new CalendarDate(fromView(startOfWeek(date, weekStart)).plus({ days: 6 }).endOf('day').toMillis());
export const addMonths = (date: Date, months: number) => new CalendarDate(fromView(date).plus({ months }).toMillis());
export const subMonths = (date: Date, months: number) => addMonths(date, -months);
export const isSameMonth = (a: Date, b: Date) => fromView(a).hasSame(fromView(b), 'month');
export const isSameDay = (a: Date, b: Date) => fromView(a).hasSame(fromView(b), 'day');
export const eachDayOfInterval = ({ start, end }: { start: Date; end: Date }) => {
  const result: Date[] = [];
  for (let date = new CalendarDate(start); date <= end; date = addDays(date, 1)) result.push(date);
  return result;
};
export const sessionDayBounds = (session: { startTime: string; endTime: string }, date: Date, timezone: string) => {
  const dayStart = new CalendarDate(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  const start = new CalendarDate(Math.max(calendarViewDate(session.startTime, timezone).getTime(), dayStart.getTime()));
  const end = new CalendarDate(Math.min(calendarViewDate(session.endTime, timezone).getTime(), dayEnd.getTime()));
  return { start, end, minutes: Math.max(0, (end.getTime() - start.getTime()) / 60000) };
};
