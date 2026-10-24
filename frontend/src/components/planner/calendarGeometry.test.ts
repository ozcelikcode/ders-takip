import { CalendarDate } from '@study-tracker/contracts';
import { describe, expect, it } from 'vitest';
import type { StudySession } from '../../types/planner';
import {
  buildDaySegments,
  dayMinWidths,
  occupiedSlotKeys,
  slotNavigationTarget,
  calendarSegment,
  calendarCardMinHeight,
  layoutCalendarCards,
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
    'keeps adjacent short card targets separate across an hour boundary on a %ipx grid',
    (height) => {
      const cards = [
        { id: 1, top: height * (9 + 59 / 60), height: height / 60 },
        { id: 2, top: height * 10, height: height / 60 },
        { id: 3, top: height * (10 + 1 / 60), height: height / 60 },
        { id: 4, top: height * 12, height },
      ];
      const placements = layoutCalendarCards(cards);
      for (const first of cards)
        for (const second of cards) {
          if (first.id >= second.id) continue;
          const a = placements.get(first.id)!;
          const b = placements.get(second.id)!;
          if (
            first.top < second.top + b.height &&
            second.top < first.top + a.height
          ) {
            expect(a.lane).not.toBe(b.lane);
            expect(a.laneCount).toBe(b.laneCount);
          }
        }
      expect(placements.get(1)?.height).toBe(calendarCardMinHeight);
      expect(placements.get(1)?.laneCount).toBe(3);
      expect(placements.get(4)).toMatchObject({
        lane: 0,
        laneCount: 1,
        height,
      });
    },
  );
  it('reuses free lanes inside a connected group and keeps ordering stable without mutating source cards', () => {
    const cards = [
      { id: 3, top: 50, height: 28 },
      { id: 2, top: 0, height: 28 },
      { id: 1, top: 0, height: 100 },
    ];
    const before = structuredClone(cards);
    const result = layoutCalendarCards(cards);
    expect(result.get(1)).toMatchObject({ lane: 0, laneCount: 2 });
    expect(result.get(2)).toMatchObject({ lane: 1, laneCount: 2 });
    expect(result.get(3)).toMatchObject({ lane: 1, laneCount: 2 });
    expect([...layoutCalendarCards([...cards].reverse())]).toEqual([...result]);
    expect(cards).toEqual(before);
    expect(layoutCalendarCards([]).size).toBe(0);
    expect(
      layoutCalendarCards([
        { id: 1, top: 0, height: 28 },
        { id: 2, top: 28, height: 28 },
      ]).get(2),
    ).toMatchObject({ lane: 0, laneCount: 1 });
  });
  it('retains sub-minute start placement without changing persisted timing', () => {
    expect(
      calendarSegment(
        session,
        new CalendarDate('2026-10-16'),
        'Europe/Istanbul',
        64,
      ).top,
    ).toBeCloseTo((0.1 / 3600) * 64);
    expect(session.startTime).toBe('2026-10-16T06:00:00.100Z');
  });
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

describe('calendar day layout helpers', () => {
  // Istanbul is UTC+3 all year, so 06:00Z is 09:00 local.
  const days = [new CalendarDate(Date.UTC(2026, 9, 16)), new CalendarDate(Date.UTC(2026, 9, 17))];
  const hourHeight = 48;

  it('assigns segments to the matching day and applies the live resize preview', () => {
    const resized = buildDaySegments(days, [session], { sessionId: 1, minutes: 120 }, 'Europe/Istanbul', hourHeight);
    expect(resized[0]).toHaveLength(1);
    expect(resized[1]).toHaveLength(0);
    expect(resized[0][0].preview.duration).toBe(120);
    expect(resized[0][0].session.duration).toBe(60);
    expect(resized[0][0].segment.hour).toBe(9);
  });

  it('keeps empty weekly days narrow and widens busy days by lane count', () => {
    const segments = buildDaySegments(days, [session], null, 'Europe/Istanbul', hourHeight);
    expect(dayMinWidths(segments, true)).toEqual([160, 104]);
    expect(dayMinWidths(segments, false)).toEqual([160, 160]);
  });

  it('marks only slots overlapped by non-cancelled sessions as occupied', () => {
    const planned = occupiedSlotKeys(buildDaySegments(days, [session], null, 'Europe/Istanbul', hourHeight), hourHeight);
    // 09:00–10:00:00.7 local: the sub-second tail still overlaps the 10:00 slot.
    expect([...planned].sort()).toEqual(['0:10', '0:9']);
    expect(planned.has('0:9')).toBe(true);
    expect(planned.has('0:8')).toBe(false);
    const cancelled = occupiedSlotKeys(
      buildDaySegments(days, [{ ...session, status: 'cancelled' }], null, 'Europe/Istanbul', hourHeight),
      hourHeight,
    );
    expect(cancelled.size).toBe(0);
  });

  it('resolves keyboard navigation between free slots', () => {
    const free = ['0:8', '0:11', '1:8', '1:11'];
    expect(slotNavigationTarget(free, 'ArrowDown', false, 0, 8)).toBe('0:11');
    expect(slotNavigationTarget(free, 'ArrowUp', false, 0, 8)).toBeNull();
    expect(slotNavigationTarget(free, 'ArrowRight', false, 0, 8)).toBe('1:8');
    expect(slotNavigationTarget(free, 'Home', false, 1, 11)).toBe('1:8');
    expect(slotNavigationTarget(free, 'End', false, 0, 8)).toBe('0:11');
    expect(slotNavigationTarget(free, 'Home', true, 1, 11)).toBe('0:8');
    expect(slotNavigationTarget(free, 'End', true, 0, 8)).toBe('1:11');
    expect(slotNavigationTarget(free, 'Enter', false, 0, 8)).toBeUndefined();
  });
});
