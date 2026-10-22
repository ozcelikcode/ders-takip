import { languageTags, timezoneSchema, type Language, type WeekStart } from '@study-tracker/contracts';
import type { Locale } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import { useLanguage, useLanguageStore } from '../store/languageStore';

// Formatting follows the interface language; the words themselves live in the i18n catalogs.
const dateFnsLocales: Record<Language, Locale> = { tr, en: enUS };

/** Locale details for formatting in the current interface language. */
export const useLocale = () => {
  const language = useLanguage();
  return { language, tag: languageTags[language], dateFns: dateFnsLocales[language] };
};
/** The current BCP 47 tag for helpers outside components (sorting, Luxon formatting). */
export const currentLocaleTag = () => languageTags[useLanguageStore.getState().language];

/** JS weekday numbers in display order for the configured week start. */
export const orderedWeekdays = (weekStart: WeekStart) =>
  Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);

/** The browser's IANA time zone when it is one the server also accepts. */
export const browserTimezone = (): string | null => {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezoneSchema.safeParse(zone).success ? zone : null;
  } catch {
    return null;
  }
};

/** Every IANA zone the browser knows, always including the given extras. */
export const listTimezones = (...extras: (string | null | undefined)[]): string[] => {
  const supported = (Intl as { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf?.('timeZone') ?? [];
  return [...new Set([...supported, 'UTC', ...extras.filter((zone): zone is string => !!zone)])].sort();
};
