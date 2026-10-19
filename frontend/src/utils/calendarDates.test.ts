import { describe, it, expect } from 'vitest';
import { calendarViewDate, calendarViewInstant } from '@study-tracker/contracts';
import { addDays, endOfWeek, format, startOfWeek, sessionDayBounds } from './calendarDates';
import { orderedWeekdays, weekdayLabel } from '../lib/locale';
describe('timezone calendar adapters', () => {
  it('moves a wall time across a DST boundary without shifting the selected hour', () => {
    const view = calendarViewDate('2026-03-07T14:30:00Z', 'America/New_York');
    const moved = addDays(view, 1);
    expect(format(moved, 'HH:mm')).toBe('09:30');
    expect(calendarViewInstant(moved, 'America/New_York').toISOString()).toBe('2026-03-08T13:30:00.000Z');
    expect(format(startOfWeek(moved), 'yyyy-MM-dd')).toBe('2026-03-02');
  });
  it('clips an overnight session into each visible calendar day', () => {
    const session = { startTime: '2026-10-15T20:30:00Z', endTime: '2026-10-15T21:30:00Z' };
    for (const date of ['2026-10-15T12:00:00Z', '2026-10-16T12:00:00Z']) {
      const view = calendarViewDate(date, 'Europe/Istanbul');
      expect(sessionDayBounds(session, view, 'Europe/Istanbul').minutes).toBe(30);
    }
    expect(sessionDayBounds(session, calendarViewDate('2026-10-16T12:00:00Z', 'Europe/Istanbul'), 'Europe/Istanbul').start.getHours()).toBe(0);
  });
});

describe('configurable week start', () => {
  // 2026-10-21 is a Wednesday.
  const wednesday = calendarViewDate('2026-10-21T12:00:00Z', 'UTC');
  it.each([
    [1, '2026-10-19', '2026-10-25'],
    [0, '2026-10-18', '2026-10-24'],
    [6, '2026-10-17', '2026-10-23'],
  ] as const)('starts the week on JS weekday %i', (weekStart, start, end) => {
    expect(format(startOfWeek(wednesday, weekStart), 'yyyy-MM-dd')).toBe(start);
    expect(format(endOfWeek(wednesday, weekStart), 'yyyy-MM-dd HH:mm')).toBe(`${end} 23:59`);
    expect(format(startOfWeek(startOfWeek(wednesday, weekStart), weekStart), 'yyyy-MM-dd')).toBe(start);
  });
  it('orders weekday labels from the configured start', () => {
    expect(orderedWeekdays(1).map(weekdayLabel)).toEqual(['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']);
    expect(orderedWeekdays(0).map(weekdayLabel)).toEqual(['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']);
    expect(orderedWeekdays(6).map(weekdayLabel)[0]).toBe('Cmt');
  });
});
