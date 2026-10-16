import { describe, it, expect } from 'vitest';
import { calendarViewDate, calendarViewInstant } from '@study-tracker/contracts';
import { addDays, format, startOfWeek, sessionDayBounds } from './calendarDates';
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
