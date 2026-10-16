import { CalendarDate } from '@study-tracker/contracts';
import { describe, expect, it } from 'vitest';
import type { StudySession } from '../../types/planner';
import {
  calendarSegment,
  canRepositionSession,
  moveSessionTimes,
  resizedDuration,
  snappedDropMinute,
} from './calendarGeometry';
const session: StudySession = {
  id: 1,
  userId: 1,
  title: 'Fixture',
  startTime: '2026-10-16T06:00:00.100Z',
  endTime: '2026-10-16T07:00:00.800Z',
  duration: 60,
  status: 'planned',
  sessionType: 'study',
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: '2026-10-16T00:00:00Z',
};
describe('shared calendar geometry', () => {
  it.each([48, 64])(
    'snaps equally on the %ipx grid and clamps the destination to the visible day',
    (height) => {
      expect(snappedDropMinute(11, height / 4, height)).toBe(675);
      expect(snappedDropMinute(0, -1000, height)).toBe(0);
      expect(snappedDropMinute(23, height * 4, height)).toBe(1425);
      expect(resizedDuration(60, height / 2, height)).toBe(90);
      expect(resizedDuration(60, -10000, height)).toBe(5);
      expect(resizedDuration(1400, 10000, height)).toBe(1440);
    },
  );
  it('preserves the actual fractional duration when moving rather than rounded plan minutes', () => {
    const moved = moveSessionTimes(
      session,
      new CalendarDate('2026-10-17'),
      'Europe/Istanbul',
      675,
    );
    expect(moved.startTime).toBe('2026-10-17T08:15:00.000Z');
    expect(Date.parse(moved.endTime) - Date.parse(moved.startTime)).toBe(
      3600700,
    );
    expect(
      moveSessionTimes(
        session,
        new CalendarDate('2026-10-17'),
        'Europe/Istanbul',
      ).startTime,
    ).toBe('2026-10-17T06:00:00.100Z');
  });
  it('supports midnight crossings and splits cards into the start and end segments', () => {
    const overnight = {
      ...session,
      startTime: '2026-10-16T20:30:00Z',
      endTime: '2026-10-16T21:30:00Z',
    };
    expect(
      calendarSegment(
        overnight,
        new CalendarDate('2026-10-16'),
        'Europe/Istanbul',
        48,
      ),
    ).toMatchObject({
      hour: 23,
      top: 24,
      height: 24,
      startsHere: true,
      endsHere: false,
    });
    expect(
      calendarSegment(
        overnight,
        new CalendarDate('2026-10-17'),
        'Europe/Istanbul',
        48,
      ),
    ).toMatchObject({
      hour: 0,
      top: 0,
      height: 24,
      startsHere: false,
      endsHere: true,
    });
    const moved = moveSessionTimes(
      overnight,
      new CalendarDate('2026-10-18'),
      'Europe/Istanbul',
      1425,
    );
    expect(moved).toEqual({
      startTime: '2026-10-18T20:45:00.000Z',
      endTime: '2026-10-18T21:45:00.000Z',
    });
  });
  it('rejects missing and ambiguous wall times and retains elapsed duration across DST', () => {
    expect(() =>
      moveSessionTimes(
        session,
        new CalendarDate('2026-03-08'),
        'America/New_York',
        150,
      ),
    ).toThrow();
    expect(() =>
      moveSessionTimes(
        session,
        new CalendarDate('2026-11-01'),
        'America/New_York',
        90,
      ),
    ).toThrow();
    const moved = moveSessionTimes(
      {
        ...session,
        startTime: '2026-03-07T06:30:00Z',
        endTime: '2026-03-07T08:30:00Z',
      },
      new CalendarDate('2026-03-08'),
      'America/New_York',
      90,
    );
    expect(moved).toEqual({
      startTime: '2026-03-08T06:30:00.000Z',
      endTime: '2026-03-08T08:30:00.000Z',
    });
  });
  it('locks running and completed sessions for both drag and resize', () => {
    expect(canRepositionSession(session)).toBe(true);
    expect(canRepositionSession({ ...session, status: 'paused' })).toBe(true);
    expect(canRepositionSession({ ...session, status: 'in_progress' })).toBe(
      false,
    );
    expect(canRepositionSession({ ...session, status: 'completed' })).toBe(
      false,
    );
  });
});
