import { defaultPreferences, preferencesSchema, type UserPreferences } from '@study-tracker/contracts';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

// Legacy data is retained as an archive; only canonical fields are exposed by the API.
export const migrateStoredPreferences = (stored: unknown): UserPreferences & { legacyPreferences?: unknown } => {
  const raw: unknown = typeof stored === 'string' ? JSON.parse(stored) : stored;
  const source = record(raw);
  if (source.schemaVersion !== undefined) return { ...source, ...preferencesSchema.parse(source) };
  const goals = { ...record(source.workGoals), ...record(source.studyGoals) };
  const candidates: Record<string, unknown> = {
    ...source,
    dailyStudyGoal: source.dailyStudyGoal ?? goals.dailyHours,
    weeklyStudyGoal: source.weeklyStudyGoal ?? goals.weeklyHours,
  };
  const result = { ...defaultPreferences };
  for (const key of Object.keys(defaultPreferences) as (keyof UserPreferences)[]) {
    const parsed = preferencesSchema.shape[key].safeParse(candidates[key]);
    if (parsed.success) Object.assign(result, { [key]: parsed.data });
  }
  return { ...result, legacyPreferences: raw };
};
