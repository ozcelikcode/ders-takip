import { timezoneSchema, type WeekStart } from '@study-tracker/contracts';
import { tr } from 'date-fns/locale';

// Single source for the interface locale. The UI is Turkish-only until the i18n package (R10);
// switching languages later starts here instead of in every component.
export const appLocale = 'tr';
export const dateFnsLocale = tr;

/** Short weekday labels indexed by JS weekday (0 = Sunday). */
const shortWeekdayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

/** JS weekday numbers in display order for the configured week start. */
export const orderedWeekdays = (weekStart: WeekStart) =>
  Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);

export const weekdayLabel = (jsWeekday: number) => shortWeekdayLabels[jsWeekday % 7]!;

export const weekStartLabels: Record<WeekStart, string> = { 1: 'Pazartesi', 0: 'Pazar', 6: 'Cumartesi' };

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
