import { z } from 'zod';
import { colorSchema, type UserPreferences } from './preferences.js';
export * from './studySessions.js';
export * from './sessionSeries.js';
export * from './courseGoals.js';
export * from './calendarFeed.js';
export * from './tags.js';
export * from './accountImport.js';
export * from './adminAudit.js';
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
import { defaultLanguage, languageSchema, type Language } from './language.js';

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
  // The browser address the server is configured with (FRONTEND_URL); shown, never edited.
  siteUrl: z.url({ protocol: /^https?$/ }),
  primaryColor: colorSchema,
  allowRegistration: z.boolean(),
  maintenanceMode: z.boolean(),
  // The one interface language everyone sees; stored data is never translated.
  language: languageSchema,
  terminologyPreset: terminologyPresetSchema,
  // Site-wide custom words; when set they replace the preset for everyone who follows the site.
  customTerminology: customTerminologySchema.nullable(),
});
export const siteSettingsSchema = publicSettingsSchema.extend({
  // Replies to the site's emails go here; empty means no reply address.
  adminEmail: z.email().or(z.literal('')),
  sessionTimeout: z.number().int().min(1).max(1440),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  backup_interval: z.enum(['1', '5', '7']),
});
/** The address of the site icon: a built-in icon, an image URL, or the default mark. */
export const siteIconUrl = (siteIcon: PublicSettings['siteIcon']): string =>
  brandIconNames.some((name) => name === siteIcon) ? `/brand-icons/${siteIcon}.svg` : siteIcon || '/brand-mark.svg';
export const settingsPatchSchema = siteSettingsSchema.omit({ siteUrl: true }).partial().strict();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export type PublicSettings = z.infer<typeof publicSettingsSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
/** The built-in name and description, shown in the site language until an administrator writes their own. */
export const defaultSiteIdentity: Record<Language, Pick<SiteSettings, 'siteName' | 'siteDescription'>> = {
  tr: { siteName: 'Görev Takip Sistemi', siteDescription: 'Herkes için modern görev takip ve zaman yönetimi platformu' },
  en: { siteName: 'Task Tracker', siteDescription: 'A modern task tracking and time management platform for everyone' },
};
/** A stored built-in name or description is still the built-in one, so it follows the language too. */
export const withSiteIdentity = <T extends Pick<SiteSettings, 'siteName' | 'siteDescription' | 'language'>>(settings: T): T => {
  const builtIn = Object.values(defaultSiteIdentity);
  const own = defaultSiteIdentity[settings.language];
  return {
    ...settings,
    siteName: builtIn.some((identity) => identity.siteName === settings.siteName) ? own.siteName : settings.siteName,
    siteDescription: builtIn.some((identity) => identity.siteDescription === settings.siteDescription) ? own.siteDescription : settings.siteDescription,
  };
};
export const defaultSiteSettings: SiteSettings = {
  ...defaultSiteIdentity[defaultLanguage],
  siteLogo: '',
  siteIcon: 'GraduationCap',
  siteUrl: 'http://localhost:3000',
  primaryColor: '#3B82F6',
  adminEmail: '',
  allowRegistration: true,
  maintenanceMode: false,
  language: defaultLanguage,
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
