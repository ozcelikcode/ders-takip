import { describe, expect, it } from 'vitest';
import { dailyGoalSeconds, formatGoalMinutes, goalHoursToMinutes, goalPercent, isActiveStudyDay, summarizeGoals } from './studyGoals';

// 2026-10-19 is a Monday, 2026-10-25 a Sunday.
const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
// A stale stored weekly value must not matter: the weekly goal is derived from the daily one.
const weekdaysOnly = { dailyStudyGoal: 2, weeklyStudyGoal: 99, activeStudyDays: [1, 2, 3, 4, 5] };

describe('study goals', () => {
  it('applies the daily goal only on active study days', () => {
    expect(isActiveStudyDay('2026-10-19', weekdaysOnly.activeStudyDays)).toBe(true);
    expect(isActiveStudyDay('2026-10-25', weekdaysOnly.activeStudyDays)).toBe(false);
    expect(dailyGoalSeconds('2026-10-19', weekdaysOnly)).toBe(7200);
    expect(dailyGoalSeconds('2026-10-25', weekdaysOnly)).toBeNull();
    expect(dailyGoalSeconds('2026-10-19', { ...weekdaysOnly, dailyStudyGoal: 0 })).toBeNull();
  });

  it('sums only the visible week and treats a zero weekly goal as no goal', () => {
    const days = [
      { date: '2026-10-18', studySeconds: 9999 },
      { date: '2026-10-19', studySeconds: 3600 },
      { date: '2026-10-21', studySeconds: 1800 },
    ];
    const summary = summarizeGoals(days, week, '2026-10-21', weekdaysOnly);
    expect(summary.today).toEqual({ studySeconds: 1800, goalSeconds: 7200, activeDay: true });
    expect(summary.week).toEqual({ studySeconds: 5400, goalSeconds: 36000 });
    expect(summarizeGoals(days, week, '2026-10-25', { ...weekdaysOnly, dailyStudyGoal: 0 })).toEqual({
      today: { studySeconds: 0, goalSeconds: null, activeDay: false },
      week: { studySeconds: 5400, goalSeconds: null },
    });
  });

  it('shows goals in minutes and hours', () => {
    expect([0, 30, 45, 60, 90, 1440].map(formatGoalMinutes)).toEqual(['Hedef yok', '30 dk', '45 dk', '1 sa', '1 sa 30 dk', '24 sa']);
    expect(goalHoursToMinutes(50 / 60)).toBe(50);
  });

  it('caps progress at 100 percent', () => {
    expect(goalPercent(1800, 7200)).toBe(25);
    expect(goalPercent(9000, 7200)).toBe(100);
    expect(goalPercent(100, null)).toBe(0);
  });
});
