import { z } from 'zod';
import { colorSchema, type UserPreferences } from './preferences.js';
export * from './studySessions.js';
export * from './time.js';
export * from './zonedTime.js';
export * from './studyTracking.js';
export * from './catalog.js';
export * from './pomodoro.js';
export * from './users.js';

export * from './preferences.js';
export * from './auth.js';
export * from './backups.js';
export * from './plans.js';
export * from './terminology.js';
export * from './search.js';
export * from './onboarding.js';
export * from './textSearch.js';
export * from './notifications.js';
export * from './language.js';
import { customTerminologySchema, defaultTerminologyPreset, terminologyPresetSchema } from './terminology.js';

export const brandIconNames = [
  'GraduationCap',
  'BookOpen',
  'Calendar',
  'Clock',
  'Trophy',
  'Target',
  'Lightbulb',
  'School',
  'ClipboardList',
  'Users',
] as const;
export const publicSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(100),
  siteDescription: z.string().trim().max(500),
  siteLogo: z
    .url({ protocol: /^https?$/ })
    .or(z.literal(''))
    .nullable(),
  siteIcon: z
    .enum(brandIconNames)
    .or(z.url({ protocol: /^https?$/ }))
    .or(z.literal(''))
    .nullable(),
  siteUrl: z.url({ protocol: /^https?$/ }),
  primaryColor: colorSchema,
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
  terminologyPreset: terminologyPresetSchema,
  // Site-wide custom words; when set they replace the preset for everyone who follows the site.
  customTerminology: customTerminologySchema.nullable(),
});
export const siteSettingsSchema = publicSettingsSchema.extend({
  adminEmail: z.email(),
  sessionTimeout: z.number().int().min(1).max(1440),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  backup_interval: z.enum(['1', '5', '7']),
});
export const settingsPatchSchema = siteSettingsSchema.partial().strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const defaultSiteSettings: SiteSettings = {
  siteName: 'Görev Takip Sistemi',
  siteDescription: 'Herkes için modern görev takip ve zaman yönetimi platformu',
  siteLogo: '',
  siteIcon: 'GraduationCap',
  siteUrl: 'http://localhost:3000',
  primaryColor: '#3B82F6',
  adminEmail: 'admin@example.com',
  allowRegistration: true,
  maintenanceMode: false,
  terminologyPreset: defaultTerminologyPreset,
  customTerminology: null,
  sessionTimeout: 60,
  emailNotifications: true,
  pushNotifications: true,
  backup_interval: '7',
};

export const pomodoroDefaults = (preferences: UserPreferences) => ({
  workDuration: preferences.defaultPomodoroDuration,
  shortBreak: preferences.defaultShortBreak,
  longBreak: preferences.defaultLongBreak,
  cyclesBeforeLongBreak: preferences.pomodorosUntilLongBreak,
});

export * from './http.js';
export * from './notificationText.js';
