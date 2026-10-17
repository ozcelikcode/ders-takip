import { z } from 'zod';
import { timezoneSchema } from './time.js';

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const preferencesSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.enum(['light', 'dark', 'system']),
  customPrimaryColor: colorSchema.nullable(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  taskReminders: z.boolean(),
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
  language: z.enum(['tr', 'en']),
  timezone: timezoneSchema,
  studyField: z.enum(['', 'TYT', 'AYT', 'SAY', 'EA', 'SOZ', 'DIL']).nullable(),
});
export type UserPreferences = z.infer<typeof preferencesSchema>;
export type ThemeMode = UserPreferences['theme'];
export const preferencesPatchSchema = preferencesSchema.partial().strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const defaultPreferences: UserPreferences = {
  schemaVersion: 1,
  theme: 'system',
  customPrimaryColor: null,
  emailNotifications: true,
  pushNotifications: true,
  taskReminders: true,
  defaultPomodoroDuration: 25,
  defaultShortBreak: 5,
  defaultLongBreak: 15,
  pomodorosUntilLongBreak: 4,
  weeklyStudyGoal: 28,
  dailyStudyGoal: 4,
  activeStudyDays: [1, 2, 3, 4, 5, 6, 0],
  language: 'tr',
  timezone: 'Europe/Istanbul',
  studyField: null,
};
