import { preferencesSchema, weeklyGoalHours, type UserPreferences } from '@study-tracker/contracts';

/** Applies a validated patch to stored preferences; archived legacy keys survive and the weekly goal follows the daily one. */
export const mergePreferences = (stored: UserPreferences, patch: Partial<UserPreferences>): UserPreferences => {
  const merged = preferencesSchema.parse({ ...stored, ...patch });
  return { ...stored, ...merged, weeklyStudyGoal: weeklyGoalHours(merged) };
};
