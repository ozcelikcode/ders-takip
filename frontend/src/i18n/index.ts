import type { Language } from '@study-tracker/contracts';
import { tr, type Text } from './tr';

export type { Text } from './tr';

/** Turkish ships with the app; the English catalog is fetched only when the site is set to English. */
export const loadText = (language: Language): Promise<Text> =>
  language === 'en' ? import('./en').then((module) => module.en) : Promise.resolve(tr);
