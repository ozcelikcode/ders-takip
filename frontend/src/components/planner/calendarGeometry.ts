import {
  CalendarDate,
  calendarViewDate,
  calendarViewInstant,
} from '@study-tracker/contracts';
import { addDays, format, sessionDayBounds } from '../../utils/calendarDates';
import type { StudySession } from '../../types/planner';

export const calendarHours = Array.from({ length: 24 }, (_, hour) => hour);
export type CalendarMode = 'daily' | 'weekly';
export const canRepositionSession = (session: StudySession) =>
  session.status !== 'in_progress' && session.status !== 'completed';
export const sessionMinutes = (session: StudySession) =>
  (Date.parse(session.endTime) - Date.parse(session.startTime)) / 60000;
export const snappedDropMinute = (
  hour: number,
  offsetPixels: number,
  hourHeight: number,
) =>
  Math.max(
    0,
    Math.min(
      1425,
      hour * 60 + Math.round((offsetPixels / hourHeight) * 4) * 15,
    ),
  );
export const resizedDuration = (
  duration: number,
  deltaPixels: number,
  hourHeight: number,
) =>
  Math.max(
    5,
    Math.min(
      1440,
      Math.round((duration + (deltaPixels / hourHeight) * 60) / 5) * 5,
    ),
  );

export function moveSessionTimes(
  session: StudySession,
  date: Date,
  timezone: string,
  minute?: number,
) {
  const original = calendarViewDate(session.startTime, timezone);
  const target = new CalendarDate(date);
  target.setHours(
    0,
    minute ?? original.getHours() * 60 + original.getMinutes(),
    minute === undefined ? original.getSeconds() : 0,
    minute === undefined ? original.getMilliseconds() : 0,
  );
  const start = calendarViewInstant(target, timezone);
  return {
    startTime: start.toISOString(),
    endTime: new Date(
      start.getTime() +
        Date.parse(session.endTime) -
        Date.parse(session.startTime),
    ).toISOString(),
  };
}

export function calendarSegment(
  session: StudySession,
  date: Date,
  timezone: string,
  hourHeight: number,
) {
  const bounds = sessionDayBounds(session, date, timezone);
  return {
    hour: bounds.start.getHours(),
    top: (bounds.start.getMinutes() / 60) * hourHeight,
    height: (bounds.minutes / 60) * hourHeight,
    minutes: bounds.minutes,
    startsHere:
      format(calendarViewDate(session.startTime, timezone), 'yyyy-MM-dd') ===
      format(date, 'yyyy-MM-dd'),
    endsHere:
      calendarViewDate(session.endTime, timezone).getTime() <=
      addDays(
        new CalendarDate(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
        ),
        1,
      ).getTime(),
  };
}
