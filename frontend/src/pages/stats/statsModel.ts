import { daysSinceWeekStart, type SessionStats, type UserPreferences, type WeekStart } from '@study-tracker/contracts';
import { DateTime } from 'luxon';
import type { CatalogCourse } from '../../types/catalog';
import { dailyGoalSeconds, isActiveStudyDay } from '../../utils/studyGoals';

export type RangePreset = 'week' | 'month' | 'last30' | 'last90' | 'custom';
export interface DateRange {
  startDate: string;
  endDate: string;
}

/** The server rejects ranges longer than this. */
export const maxRangeDays = 366;

const day = (date: string) => DateTime.fromISO(date, { zone: 'UTC' });
const iso = (date: DateTime) => date.toISODate()!;

/** Calendar range for a preset, anchored on the user's local today. */
export const presetRange = (preset: Exclude<RangePreset, 'custom'>, today: string, weekStart: WeekStart): DateRange => {
  const now = day(today);
  switch (preset) {
    case 'week': {
      const start = now.minus({ days: daysSinceWeekStart(now.weekday % 7, weekStart) });
      return { startDate: iso(start), endDate: iso(start.plus({ days: 6 })) };
    }
    case 'month':
      return { startDate: iso(now.startOf('month')), endDate: iso(now.endOf('month')) };
    case 'last30':
      return { startDate: iso(now.minus({ days: 29 })), endDate: today };
    case 'last90':
      return { startDate: iso(now.minus({ days: 89 })), endDate: today };
  }
};

export const rangeDays = ({ startDate, endDate }: DateRange) =>
  Math.round(day(endDate).diff(day(startDate), 'days').days) + 1;

export type RangeError = 'missing' | 'reversed' | 'tooLong';
/** Why a user-entered range cannot be requested, or null when it can; screens word it. */
export const rangeError = (range: DateRange): RangeError | null => {
  if (!range.startDate || !range.endDate) return 'missing';
  if (range.startDate > range.endDate) return 'reversed';
  if (rangeDays(range) > maxRangeDays) return 'tooLong';
  return null;
};

export interface DistributionRow {
  key: string;
  label: string;
  color: string | null;
  studySeconds: number;
  share: number;
}

const toRows = (groups: Map<string, Omit<DistributionRow, 'share' | 'key'>>, total: number): DistributionRow[] =>
  [...groups.entries()]
    .map(([key, row]) => ({ key, ...row, share: total > 0 ? row.studySeconds / total : 0 }))
    .sort((a, b) => b.studySeconds - a.studySeconds);

/** Groups measured study by course and by category; unknown or missing courses fall into "unassigned". */
export const distribution = (rows: SessionStats['courses'], courses: readonly CatalogCourse[], unassigned: string) => {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const total = rows.reduce((sum, row) => sum + row.studySeconds, 0);
  const byCourse = new Map<string, Omit<DistributionRow, 'share' | 'key'>>();
  const byCategory = new Map<string, Omit<DistributionRow, 'share' | 'key'>>();
  const add = (map: typeof byCourse, key: string, label: string, color: string | null, seconds: number) => {
    const entry = map.get(key) ?? { label, color, studySeconds: 0 };
    entry.studySeconds += seconds;
    map.set(key, entry);
  };
  for (const row of rows) {
    const course = row.courseId === null ? undefined : byId.get(row.courseId);
    if (course) add(byCourse, `course-${course.id}`, course.name, course.color, row.studySeconds);
    else add(byCourse, 'unassigned', unassigned, null, row.studySeconds);
    if (course?.category) add(byCategory, `category-${course.category.id}`, course.category.name, course.category.color, row.studySeconds);
    else add(byCategory, 'unassigned', unassigned, null, row.studySeconds);
  }
  return { total, byCourse: toRows(byCourse, total), byCategory: toRows(byCategory, total) };
};

export interface GoalComparison {
  /** Sum of daily goals over the active days in range; null when no daily goal is set. */
  targetSeconds: number | null;
  studySeconds: number;
  activeDays: number;
  metDays: number;
}

/** Measured study against the daily goal over every active day in the range. */
export const compareWithGoal = (
  days: readonly { date: string; studySeconds: number }[],
  preferences: Pick<UserPreferences, 'dailyStudyGoal' | 'weeklyStudyGoal' | 'activeStudyDays'>,
): GoalComparison => {
  let target = 0;
  let activeDays = 0;
  let metDays = 0;
  for (const { date, studySeconds } of days) {
    if (!isActiveStudyDay(date, preferences.activeStudyDays)) continue;
    activeDays++;
    const goal = dailyGoalSeconds(date, preferences);
    if (goal === null) continue;
    target += goal;
    if (studySeconds >= goal) metDays++;
  }
  return {
    targetSeconds: preferences.dailyStudyGoal > 0 ? target : null,
    studySeconds: days.reduce((sum, entry) => sum + entry.studySeconds, 0),
    activeDays,
    metDays,
  };
};
