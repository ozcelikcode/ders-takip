import { z } from 'zod';

/** Site languages: the administrator picks one and everyone sees it; Turkish is the source catalog and the default. */
export const languages = ['tr', 'en'] as const;
export const languageSchema = z.enum(languages);
export type Language = z.infer<typeof languageSchema>;
export const defaultLanguage: Language = 'tr';

/** BCP 47 tags for Intl and date formatting. */
export const languageTags: Record<Language, string> = { tr: 'tr-TR', en: 'en-US' };
