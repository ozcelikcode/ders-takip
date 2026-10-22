import { z } from 'zod';
import { timezoneSchema, weekStartSchema, defaultWeekStart, type WeekStart } from './time.js';
import { customTerminologySchema, terminologyPresetSchema, type CustomTerminology, type TerminologyPresetId } from './terminology.js';
import { defaultLanguage, type Language } from './language.js';
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
  timezone: timezoneSchema,
  // Optional so accounts stored before this field keep validating; absent means Monday.
  weekStartsOn: weekStartSchema.optional(),
  // Free-text focus area; the earlier fixed exam-track values remain valid.
  studyField: z.string().trim().max(60).nullable(),
  // Absent means the account finished onboarding or predates it; only new accounts start as pending.
  onboarding: onboardingStateSchema.optional(),
  // Personal vocabulary; null or absent follows the site-wide preset.
  terminologyPreset: terminologyPresetSchema.nullable().optional(),
  // Personal custom words; when set they win over any preset.
  customTerminology: customTerminologySchema.nullable().optional(),
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
  timezone: 'Europe/Istanbul',
  weekStartsOn: defaultWeekStart,
  studyField: null,
  terminologyPreset: null,
};
export const resolveWeekStart = (preferences: Pick<UserPreferences, 'weekStartsOn'>): WeekStart =>
  preferences.weekStartsOn ?? defaultWeekStart;
export const needsOnboarding = (preferences: Pick<UserPreferences, 'onboarding'>): boolean =>
  preferences.onboarding === 'pending';
/**
 * The vocabulary a person sees: their own custom words, else their preset, else the site's
 * custom words, else the site preset. Feed the result to `createTerms`.
 */
export const resolveTerminology = (
  preferences: Pick<UserPreferences, 'terminologyPreset' | 'customTerminology'>,
  site: { terminologyPreset: TerminologyPresetId; customTerminology: CustomTerminology | null },
): TerminologyPresetId | CustomTerminology =>
  preferences.customTerminology ?? preferences.terminologyPreset ?? site.customTerminology ?? site.terminologyPreset;
/**
 * The weekly goal is not chosen separately: it is the daily goal on every active day.
 * The stored `weeklyStudyGoal` is kept equal to this on every write; readers use this function.
 */
export const weeklyGoalHours = (preferences: Pick<UserPreferences, 'dailyStudyGoal' | 'activeStudyDays'>): number =>
  Math.min(168, preferences.dailyStudyGoal * preferences.activeStudyDays.length);
/**
 * Applies a validated patch to stored preferences. Keys outside the schema (the archived legacy
 * values) survive, and the weekly goal follows the daily one. The server and the client's
 * optimistic view use the same rule.
 */
export const mergePreferences = <T extends UserPreferences>(stored: T, patch: PreferencesPatch): T => {
  const merged = preferencesSchema.parse({ ...stored, ...patch });
  return { ...stored, ...merged, weeklyStudyGoal: weeklyGoalHours(merged) };
};
export const resolveNotifications = (preferences: Pick<UserPreferences, 'notifications'>): NotificationPreferences =>
  preferences.notifications ?? defaultNotificationPreferences;

const durationUnits: Record<Language, { hours: string; minutes: string; seconds: string; noGoal: string }> = {
  tr: { hours: 'sa', minutes: 'dk', seconds: 'sn', noGoal: 'Hedef yok' },
  en: { hours: 'h', minutes: 'min', seconds: 's', noGoal: 'No goal' },
};
/** A goal or duration in whole minutes: "45 dk", "2 sa", "1 sa 30 dk" ("45 min", "2 h"); "Hedef yok" for zero. */
export const formatGoalMinutes = (minutes: number, language: Language = defaultLanguage): string => {
  const unit = durationUnits[language];
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return unit.noGoal;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} ${unit.minutes}`;
  return rest ? `${hours} ${unit.hours} ${rest} ${unit.minutes}` : `${hours} ${unit.hours}`;
};
/** Measured time from seconds: "40 sn", "5 dk 0 sn", "2 sa 5 dk" ("40 s", "5 min 0 s", "2 h 5 min"). */
export const formatMeasuredSeconds = (seconds: number, language: Language = defaultLanguage): string => {
  const unit = durationUnits[language];
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value} ${unit.seconds}`;
  if (value < 3600) return `${Math.floor(value / 60)} ${unit.minutes} ${value % 60} ${unit.seconds}`;
  return `${Math.floor(value / 3600)} ${unit.hours} ${Math.floor((value % 3600) / 60)} ${unit.minutes}`;
};
