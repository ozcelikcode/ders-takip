import { daysSinceWeekStart, type WeekStart } from '@study-tracker/contracts';
import { DateTime } from 'luxon';
import { dailyGoalSeconds, isActiveStudyDay, type GoalPreferences } from '../../utils/studyGoals';

export interface StudyDay {
  date: string;
  studySeconds: number;
}

const day = (date: string) => DateTime.fromISO(date, { zone: 'UTC' });
const iso = (date: DateTime) => date.toISODate()!;

/** The last `count` calendar days up to and including `today`, oldest first. */
export const lastDays = (today: string, count: number) =>
  Array.from({ length: count }, (_, index) => iso(day(today).minus({ days: count - 1 - index })));

/**
 * Streaks count days with measured study in a row. A rest day (not one of the active study days) without study
 * neither breaks nor extends one, and today without study yet does not break the streak that reached yesterday.
 */
export const streaks = (days: readonly StudyDay[], today: string, activeStudyDays: readonly number[]) => {
  const studied = new Map(days.map((entry) => [entry.date, entry.studySeconds > 0]));
  const ordered = [...days].map((entry) => entry.date).sort();
  let longest = 0;
  let run = 0;
  for (const date of ordered) {
    if (studied.get(date)) longest = Math.max(longest, ++run);
    else if (isActiveStudyDay(date, activeStudyDays)) run = 0;
  }
  let current = 0;
  for (let cursor = day(today); ordered.length && iso(cursor) >= ordered[0]!; cursor = cursor.minus({ days: 1 })) {
    const date = iso(cursor);
    if (studied.get(date)) current++;
    else if (date !== today && isActiveStudyDay(date, activeStudyDays)) break;
  }
  return { current, longest };
};

/** 0 for no study, then four steps: under 30 minutes, under an hour, under two hours, two hours or more. */
export const heatLevel = (seconds: number) => (seconds <= 0 ? 0 : seconds < 1800 ? 1 : seconds < 3600 ? 2 : seconds < 7200 ? 3 : 4);

/** Columns of seven days for a year grid; the first column starts on the user's week start, padded with nulls. */
export const heatColumns = (days: readonly StudyDay[], weekStart: WeekStart): (StudyDay | null)[][] => {
  if (!days.length) return [];
  const padding = daysSinceWeekStart(day(days[0]!.date).weekday % 7, weekStart);
  const cells: (StudyDay | null)[] = [...Array.from({ length: padding }, () => null), ...days];
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, column) => cells.slice(column * 7, column * 7 + 7));
};

export const badgeIds = ['firstStudy', 'streak7', 'streak30', 'goalDays10', 'hours10', 'hours100'] as const;
export type BadgeId = (typeof badgeIds)[number];

/** Which badges are earned, from the last year of days and the all-time measured total. */
export const earnedBadges = (
  days: readonly StudyDay[],
  totalSeconds: number,
  longestStreak: number,
  preferences: GoalPreferences,
): Record<BadgeId, boolean> => {
  const goalDays = days.filter((entry) => {
    const goal = dailyGoalSeconds(entry.date, preferences);
    return goal !== null && entry.studySeconds >= goal;
  }).length;
  return {
    firstStudy: totalSeconds > 0,
    streak7: longestStreak >= 7,
    streak30: longestStreak >= 30,
    goalDays10: goalDays >= 10,
    hours10: totalSeconds >= 10 * 3600,
    hours100: totalSeconds >= 100 * 3600,
  };
};
