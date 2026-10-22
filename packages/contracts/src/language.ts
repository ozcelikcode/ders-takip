import { z } from 'zod';

/** Interface languages; Turkish is the source catalog and the fallback. */
export const languages = ['tr', 'en'] as const;
export const languageSchema = z.enum(languages);
export type Language = z.infer<typeof languageSchema>;
export const defaultLanguage: Language = 'tr';

/** BCP 47 tags for Intl and date formatting. */
export const languageTags: Record<Language, string> = { tr: 'tr-TR', en: 'en-US' };

/**
 * The first supported language among the browser's preferences (`navigator.languages`),
 * matched by primary subtag: "en-GB" → "en". Null when none is supported.
 */
export const preferredLanguage = (candidates: readonly string[]): Language | null => {
  for (const candidate of candidates) {
    const primary = candidate.toLowerCase().split('-')[0];
    const match = languages.find((language) => language === primary);
    if (match) return match;
  }
  return null;
};
