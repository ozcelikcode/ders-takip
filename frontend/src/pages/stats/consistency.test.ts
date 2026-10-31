import { describe, expect, it } from 'vitest';
import { earnedBadges, heatColumns, heatLevel, lastDays, streaks } from './consistency';

const weekdays = [1, 2, 3, 4, 5];
const series = (entries: Record<string, number>, today: string, count = 14) =>
  lastDays(today, count).map((date) => ({ date, studySeconds: entries[date] ?? 0 }));

describe('streaks', () => {
  it('counts days in a row, lets rest days pass and keeps a streak alive before today is studied', () => {
    // 2026-10-19 is a Monday; the weekend 17–18 is a rest day.
    const days = series({ '2026-10-15': 60, '2026-10-16': 60, '2026-10-19': 60, '2026-10-20': 60 }, '2026-10-21');
    expect(streaks(days, '2026-10-21', weekdays)).toEqual({ current: 4, longest: 4 });
  });
  it('breaks on an active day without study and keeps the longest run', () => {
    const days = series({ '2026-10-12': 60, '2026-10-13': 60, '2026-10-14': 60, '2026-10-16': 60 }, '2026-10-16');
    expect(streaks(days, '2026-10-16', weekdays)).toEqual({ current: 1, longest: 3 });
    expect(streaks(series({}, '2026-10-16'), '2026-10-16', weekdays)).toEqual({ current: 0, longest: 0 });
  });
  it('lets study on a rest day extend a streak', () => {
    const days = series({ '2026-10-16': 60, '2026-10-17': 60, '2026-10-19': 60 }, '2026-10-19');
    expect(streaks(days, '2026-10-19', weekdays).current).toBe(3);
  });
});

it('grades a day into five heat levels', () => {
  expect([0, 60, 1800, 3600, 7200].map(heatLevel)).toEqual([0, 1, 2, 3, 4]);
});

it('lays the year out in weeks that start on the chosen week start', () => {
  // 2026-10-21 is a Wednesday: two empty cells before it when weeks start on Monday.
  const columns = heatColumns(series({}, '2026-10-27', 7), 1);
  expect(columns[0]!.slice(0, 3).map((cell) => cell?.date ?? null)).toEqual([null, null, '2026-10-21']);
  expect(columns.flat().filter(Boolean)).toHaveLength(7);
});

it('earns badges from streaks, goal days and the all-time total', () => {
  const goalDays = series(Object.fromEntries(lastDays('2026-10-16', 10).map((date) => [date, 7200])), '2026-10-16');
  const preferences = { dailyStudyGoal: 1, activeStudyDays: [0, 1, 2, 3, 4, 5, 6] };
  expect(earnedBadges(goalDays, 20 * 3600, 10, preferences)).toEqual({
    firstStudy: true, streak7: true, streak30: false, goalDays10: true, hours10: true, hours100: false,
  });
  expect(Object.values(earnedBadges([], 0, 0, preferences)).some(Boolean)).toBe(false);
});

it('shares measured time by tag against the whole range, naming only known tags', async () => {
  const { tagDistribution } = await import('./statsModel');
  const rows = tagDistribution(
    [{ tagId: 1, studySeconds: 1800, sessions: 2 }, { tagId: 2, studySeconds: 900, sessions: 1 }, { tagId: 9, studySeconds: 60, sessions: 1 }],
    [{ id: 1, name: 'Sınav' }, { id: 2, name: 'Okuma' }],
    3600,
  );
  expect(rows.map((row) => [row.label, row.share])).toEqual([['Sınav', 0.5], ['Okuma', 0.25]]);
});
