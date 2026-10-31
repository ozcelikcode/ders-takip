import { weeklyGoalHours, type UserPreferences } from '@study-tracker/contracts';

const hour = 3600;

export type GoalPreferences = Pick<UserPreferences, 'dailyStudyGoal' | 'activeStudyDays'>;

/** Largest daily goal, in minutes (24 hours). */
export const maxDailyGoalMinutes = 24 * 60;

/** Goals are stored in hours but chosen and shown in whole minutes. */
export const goalHoursToMinutes = (hours: number) => Math.round(hours * 60);
export const goalMinutesToHours = (minutes: number) => minutes / 60;

// The formatter lives in contracts because notification emails use it too.
export { formatGoalMinutes } from '@study-tracker/contracts';

/** Whether a calendar day (YYYY-MM-DD) is one of the user's study days. */
export const isActiveStudyDay = (date: string, activeStudyDays: readonly number[]) =>
  activeStudyDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());

/** Daily target in seconds; null on rest days or when no daily goal is set. */
export const dailyGoalSeconds = (date: string, preferences: GoalPreferences) =>
  preferences.dailyStudyGoal > 0 && isActiveStudyDay(date, preferences.activeStudyDays)
    ? preferences.dailyStudyGoal * hour
    : null;

export interface GoalSummary {
  today: { studySeconds: number; goalSeconds: number | null; activeDay: boolean };
  week: { studySeconds: number; goalSeconds: number | null };
}

/** Measured study time against the daily and weekly goals for the visible week. */
export const summarizeGoals = (
  days: readonly { date: string; studySeconds: number }[],
  weekDates: readonly string[],
  today: string,
  preferences: GoalPreferences,
): GoalSummary => {
  const secondsOn = (date: string) => days.find((day) => day.date === date)?.studySeconds ?? 0;
  return {
    today: {
      studySeconds: secondsOn(today),
      goalSeconds: dailyGoalSeconds(today, preferences),
      activeDay: isActiveStudyDay(today, preferences.activeStudyDays),
    },
    week: {
      studySeconds: weekDates.reduce((total, date) => total + secondsOn(date), 0),
      goalSeconds: weeklyGoalHours(preferences) > 0 ? weeklyGoalHours(preferences) * hour : null,
    },
  };
};

/** Completion percentage capped at 100; 0 when there is no goal. */
export const goalPercent = (studySeconds: number, goalSeconds: number | null) =>
  goalSeconds ? Math.min(100, Math.round((studySeconds / goalSeconds) * 100)) : 0;
