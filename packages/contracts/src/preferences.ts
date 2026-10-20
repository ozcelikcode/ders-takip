import { z } from 'zod';
import { timezoneSchema, weekStartSchema, defaultWeekStart, type WeekStart } from './time.js';
import { terminologyPresetSchema, type TerminologyPresetId } from './terminology.js';
import { defaultNotificationPreferences, notificationPreferencesSchema, type NotificationPreferences } from './notifications.js';

export const onboardingStateSchema = z.enum(['pending', 'done']);

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const preferencesSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.enum(['light', 'dark', 'system']),
  customPrimaryColor: colorSchema.nullable(),
  defaultPomodoroDuration: z.number().int().min(1).max(120),
  defaultShortBreak: z.number().int().min(1).max(30),
  defaultLongBreak: z.number().int().min(1).max(60),
  pomodorosUntilLongBreak: z.number().int().min(1).max(10),
  weeklyStudyGoal: z.number().min(0).max(168),
  dailyStudyGoal: z.number().min(0).max(24),
  activeStudyDays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .refine((days) => new Set(days).size === days.length),
  // Reserved for interface translation; the UI is Turkish-only until the i18n package (R10).
  language: z.enum(['tr', 'en']),
  timezone: timezoneSchema,
  // Optional so accounts stored before this field keep validating; absent means Monday.
  weekStartsOn: weekStartSchema.optional(),
  // Free-text focus area; the earlier fixed exam-track values remain valid.
  studyField: z.string().trim().max(60).nullable(),
  // Absent means the account finished onboarding or predates it; only new accounts start as pending.
  onboarding: onboardingStateSchema.optional(),
  // Personal vocabulary; null or absent follows the site-wide preset.
  terminologyPreset: terminologyPresetSchema.nullable().optional(),
  // Opt-in delivery choices; absent means everything off (see `resolveNotifications`).
  notifications: notificationPreferencesSchema.optional(),
});
export type UserPreferences = z.infer<typeof preferencesSchema>;
export type ThemeMode = UserPreferences['theme'];
export const preferencesPatchSchema = preferencesSchema.partial().strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const defaultPreferences: UserPreferences = {
  schemaVersion: 1,
  theme: 'system',
  customPrimaryColor: null,
  defaultPomodoroDuration: 25,
  defaultShortBreak: 5,
  defaultLongBreak: 15,
  pomodorosUntilLongBreak: 4,
  weeklyStudyGoal: 28,
  dailyStudyGoal: 4,
  activeStudyDays: [1, 2, 3, 4, 5, 6, 0],
  language: 'tr',
  timezone: 'Europe/Istanbul',
  weekStartsOn: defaultWeekStart,
  studyField: null,
  terminologyPreset: null,
};
export const resolveWeekStart = (preferences: Pick<UserPreferences, 'weekStartsOn'>): WeekStart =>
  preferences.weekStartsOn ?? defaultWeekStart;
export const needsOnboarding = (preferences: Pick<UserPreferences, 'onboarding'>): boolean =>
  preferences.onboarding === 'pending';
export const resolveTerminologyPreset = (
  preferences: Pick<UserPreferences, 'terminologyPreset'>,
  sitePreset: TerminologyPresetId,
): TerminologyPresetId => preferences.terminologyPreset ?? sitePreset;
/**
 * The weekly goal is not chosen separately: it is the daily goal on every active day.
 * The stored `weeklyStudyGoal` is kept equal to this on every write; readers use this function.
 */
export const weeklyGoalHours = (preferences: Pick<UserPreferences, 'dailyStudyGoal' | 'activeStudyDays'>): number =>
  Math.min(168, preferences.dailyStudyGoal * preferences.activeStudyDays.length);
export const resolveNotifications = (preferences: Pick<UserPreferences, 'notifications'>): NotificationPreferences =>
  preferences.notifications ?? defaultNotificationPreferences;

/** A goal or duration in whole minutes: "45 dk", "2 sa", "1 sa 30 dk"; "Hedef yok" for zero. */
export const formatGoalMinutes = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return 'Hedef yok';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} dk`;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
};
