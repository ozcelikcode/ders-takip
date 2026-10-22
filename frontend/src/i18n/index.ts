import { defaultLanguage, languageSchema, preferredLanguage, type Language } from '@study-tracker/contracts';
import { tr, type Text } from './tr';

export type { Text } from './tr';

/** Turkish ships with the app; other catalogs are fetched only when chosen. */
export const loadText = (language: Language): Promise<Text> =>
  language === 'en' ? import('./en').then((module) => module.en) : Promise.resolve(tr);

const storageKey = 'interface-language';
/** The language last shown on this device, so the sign-in page opens in it; only a language code is kept. */
export const rememberedLanguage = (): Language | null => {
  try {
    const parsed = languageSchema.safeParse(localStorage.getItem(storageKey));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
export const rememberLanguage = (language: Language) => {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Storage is a convenience; the account preference stays the source of truth.
  }
};
export const browserLanguage = (): Language | null =>
  typeof navigator === 'undefined' ? null : preferredLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
/** Before sign-in: the language last used here, else the browser's, else Turkish. */
export const initialLanguage = (): Language => rememberedLanguage() ?? browserLanguage() ?? defaultLanguage;
