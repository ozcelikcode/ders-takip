import { z } from 'zod';
import { timezoneSchema } from './time.js';
export * from './studySessions.js';
export * from './time.js';
export * from './studyTracking.js';
export * from './catalog.js';
export * from './pomodoro.js';
export * from './users.js';

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const preferencesSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.enum(['light', 'dark', 'system']),
  customPrimaryColor: colorSchema.nullable(),
  emailNotifications: z.boolean(), pushNotifications: z.boolean(), taskReminders: z.boolean(),
  defaultPomodoroDuration: z.number().int().min(1).max(120),
  defaultShortBreak: z.number().int().min(1).max(30),
  defaultLongBreak: z.number().int().min(1).max(60),
  pomodorosUntilLongBreak: z.number().int().min(1).max(10),
  weeklyStudyGoal: z.number().min(0).max(168), dailyStudyGoal: z.number().min(0).max(24),
  activeStudyDays: z.array(z.number().int().min(0).max(6)).max(7).refine(days => new Set(days).size === days.length),
  language: z.enum(['tr', 'en']),
  timezone: timezoneSchema,
  studyField: z.enum(['', 'TYT', 'AYT', 'SAY', 'EA', 'SOZ', 'DIL']).nullable(),
});
export type UserPreferences = z.infer<typeof preferencesSchema>;
export type ThemeMode = UserPreferences['theme'];
export const preferencesPatchSchema = preferencesSchema.partial().strict();
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>;
export const defaultPreferences: UserPreferences = {
  schemaVersion: 1, theme: 'system', customPrimaryColor: null,
  emailNotifications: true, pushNotifications: true, taskReminders: true,
  defaultPomodoroDuration: 25, defaultShortBreak: 5, defaultLongBreak: 15, pomodorosUntilLongBreak: 4,
  weeklyStudyGoal: 28, dailyStudyGoal: 4, activeStudyDays: [1, 2, 3, 4, 5, 6, 0],
  language: 'tr', timezone: 'Europe/Istanbul', studyField: null,
};

export const brandIconNames = ['GraduationCap', 'BookOpen', 'Calendar', 'Clock', 'Trophy', 'Target', 'Lightbulb', 'School', 'ClipboardList', 'Users'] as const;
export const publicSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(100), siteDescription: z.string().trim().max(500),
  siteLogo: z.url({ protocol: /^https?$/ }).or(z.literal('')).nullable(),
  siteIcon: z.enum(brandIconNames).or(z.url({ protocol: /^https?$/ })).or(z.literal('')).nullable(),
  siteUrl: z.url({ protocol: /^https?$/ }), primaryColor: colorSchema, secondaryColor: colorSchema,
  allowRegistration: z.boolean(), maintenanceMode: z.boolean(),
});
export const siteSettingsSchema = publicSettingsSchema.extend({
  adminEmail: z.email(),
  sessionTimeout: z.number().int().min(1).max(1440),
  emailNotifications: z.boolean(), pushNotifications: z.boolean(), backup_interval: z.enum(['1', '5', '7']),
});
export const settingsPatchSchema = siteSettingsSchema.partial().strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const defaultSiteSettings: SiteSettings = {
  siteName: 'Görev Takip Sistemi', siteDescription: 'Herkes için modern görev takip ve zaman yönetimi platformu',
  siteLogo: '', siteIcon: 'GraduationCap', siteUrl: 'http://localhost:3000', primaryColor: '#3B82F6', secondaryColor: '#10B981',
  adminEmail: 'admin@example.com', allowRegistration: true, maintenanceMode: false,
  sessionTimeout: 60, emailNotifications: true, pushNotifications: true, backup_interval: '7',
};

export const pomodoroDefaults = (preferences: UserPreferences) => ({
  workDuration: preferences.defaultPomodoroDuration,
  shortBreak: preferences.defaultShortBreak,
  longBreak: preferences.defaultLongBreak,
  cyclesBeforeLongBreak: preferences.pomodorosUntilLongBreak,
});
