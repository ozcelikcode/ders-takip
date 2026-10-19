import { z } from 'zod';

/** The three catalog/planning concepts whose display words an admin can switch. */
export const termKeys = ['course', 'topic', 'session'] as const;
export type TermKey = (typeof termKeys)[number];

export const terminologyPresetIds = ['general', 'education', 'goals', 'skills'] as const;
export const terminologyPresetSchema = z.enum(terminologyPresetIds);
export type TerminologyPresetId = z.infer<typeof terminologyPresetSchema>;

export const defaultTerminologyPreset: TerminologyPresetId = 'general';

interface TerminologyPreset {
  label: string;
  description: string;
  /** Lower-case nominative singular forms; every other form is derived by `inflect`. */
  words: Record<TermKey, string>;
}

export const terminologyPresets: Record<TerminologyPresetId, TerminologyPreset> = {
  general: {
    label: 'Genel',
    description: 'Proje, görev ve seans: her tür iş ve çalışma için nötr kelimeler.',
    words: { course: 'proje', topic: 'görev', session: 'seans' },
  },
  education: {
    label: 'Eğitim',
    description: 'Ders, konu ve seans: öğrenme ve sınav hazırlığı için.',
    words: { course: 'ders', topic: 'konu', session: 'seans' },
  },
  goals: {
    label: 'Hedef',
    description: 'Hedef, adım ve seans: kişisel hedefleri adım adım ilerletmek için.',
    words: { course: 'hedef', topic: 'adım', session: 'seans' },
  },
  skills: {
    label: 'Beceri',
    description: 'Beceri, alıştırma ve seans: pratik gerektiren beceriler için.',
    words: { course: 'beceri', topic: 'alıştırma', session: 'seans' },
  },
};

export type TermCase = 'nom' | 'acc' | 'dat' | 'gen' | 'loc' | 'abl';
export interface TermOptions {
  case?: TermCase;
  plural?: boolean;
  /** Capitalize the first letter (Turkish-aware) for titles and sentence starts. */
  capitalize?: boolean;
}

const vowels = 'aeıioöuü';
const voiceless = 'çfhkpsşt';
const lastVowel = (word: string) => [...word].reverse().find((char) => vowels.includes(char)) ?? 'e';
const harmony2 = (vowel: string) => ('aıou'.includes(vowel) ? 'a' : 'e');
const fourWayInput = 'aeıioöuü';
const fourWayOutput = 'ıiıiuüuü';
const harmony4 = (vowel: string) => fourWayOutput.charAt(fourWayInput.indexOf(vowel));
const lastChar = (word: string) => word.charAt(word.length - 1);
const endsWithVowel = (word: string) => vowels.includes(lastChar(word));

/**
 * Turkish noun inflection for the preset words. It covers vowel harmony and the
 * buffer consonants; consonant softening (kitap → kitabı) is deliberately absent
 * because no preset word needs it. Add an explicit exception list before allowing
 * free-text terms.
 */
export const inflect = (word: string, { case: nounCase = 'nom', plural = false }: TermOptions = {}): string => {
  let stem = word.toLocaleLowerCase('tr');
  if (plural) stem += `l${harmony2(lastVowel(stem))}r`;
  const vowel = lastVowel(stem);
  const vowelEnding = endsWithVowel(stem);
  switch (nounCase) {
    case 'nom':
      return stem;
    case 'acc':
      return `${stem}${vowelEnding ? 'y' : ''}${harmony4(vowel)}`;
    case 'dat':
      return `${stem}${vowelEnding ? 'y' : ''}${harmony2(vowel)}`;
    case 'gen':
      return vowelEnding ? `${stem}n${harmony4(vowel)}n` : `${stem}${harmony4(vowel)}n`;
    case 'loc':
      return `${stem}${voiceless.includes(lastChar(stem)) ? 't' : 'd'}${harmony2(vowel)}`;
    case 'abl':
      return `${stem}${voiceless.includes(lastChar(stem)) ? 't' : 'd'}${harmony2(vowel)}n`;
  }
};

const capitalizeFirst = (text: string) => text.charAt(0).toLocaleUpperCase('tr') + text.slice(1);

export type Terms = Record<TermKey, (options?: TermOptions) => string>;

/** Builds the term formatter for a preset; unknown ids fall back to the default preset. */
export const createTerms = (preset: TerminologyPresetId | undefined): Terms => {
  const words = terminologyPresets[preset ?? defaultTerminologyPreset].words;
  const format = (key: TermKey) => (options: TermOptions = {}) => {
    const text = inflect(words[key], options);
    return options.capitalize ? capitalizeFirst(text) : text;
  };
  return { course: format('course'), topic: format('topic'), session: format('session') };
};
