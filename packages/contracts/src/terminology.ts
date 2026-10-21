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

/** One display word and its accusative, which carries what plain rules cannot guess. */
export interface TermWord {
  word: string;
  accusative: string;
}

const termWordPattern = /^[a-zçğıöşü]{2,24}$/;
/** Lower-cases and trims what a person typed, the form custom words are stored in. */
export const normalizeTermWord = (text: string): string => text.trim().toLocaleLowerCase('tr');

/** The accusative plain vowel harmony predicts; right for most words, wrong for kitap → kitabı or saat → saati. */
export const suggestAccusative = (word: string): string =>
  `${word}${endsWithVowel(word) ? 'y' : ''}${harmony4(lastVowel(word))}`;

const softened: Record<string, string[]> = { 'p': ['b'], 'ç': ['c'], 't': ['d'], 'k': ['ğ', 'g'] };
/**
 * Whether an accusative can belong to the word: the plain stem, a softened last consonant
 * (kitabı, rengi), a dropped last vowel (ağzı) or a doubled last consonant (hakkı), then one of ı i u ü.
 * A vowel-final word takes the buffer y (projeyi).
 */
export const accusativeFits = (word: string, accusative: string): boolean => {
  if (!termWordPattern.test(word) || !termWordPattern.test(accusative)) return false;
  if (!'ıiuü'.includes(lastChar(accusative))) return false;
  const stem = accusative.slice(0, -1);
  if (endsWithVowel(word)) return stem === `${word}y`;
  const last = lastChar(word);
  const head = word.slice(0, -1);
  const candidates = [word, `${word}${last}`, ...(softened[last] ?? []).map((consonant) => `${head}${consonant}`)];
  const beforeLast = word.charAt(word.length - 2);
  if (vowels.includes(beforeLast) && word.length > 3) candidates.push(`${word.slice(0, -2)}${last}`);
  return candidates.includes(stem);
};

export const termWordSchema = z
  .object({
    word: z.string().regex(termWordPattern, 'Tek kelime yazın: yalnız küçük harf, 2–24 harf'),
    accusative: z.string(),
  })
  .strict()
  .refine(({ word, accusative }) => accusativeFits(word, accusative), {
    message: '"-ı" hâli bu kelimeye uymuyor (ör. kitap → kitabı, saat → saati)',
    path: ['accusative'],
  });
export const customTerminologySchema = z
  .object({ course: termWordSchema, topic: termWordSchema, session: termWordSchema })
  .strict();
export type CustomTerminology = z.infer<typeof customTerminologySchema>;

/** Starts a custom vocabulary from a preset's words so a person changes only what they need. */
export const customTerminologyFrom = (preset: TerminologyPresetId): CustomTerminology => {
  const words = terminologyPresets[preset].words;
  const entry = (key: TermKey) => ({ word: words[key], accusative: suggestAccusative(words[key]) });
  return { course: entry('course'), topic: entry('topic'), session: entry('session') };
};

/**
 * Turkish noun inflection. A plain string follows regular vowel harmony; a {@link TermWord}
 * takes its vowel-suffix stem and harmony from the given accusative, which covers consonant
 * softening, dropped vowels and harmony exceptions. Plural forms follow regular rules on the plural stem.
 */
export const inflect = (term: string | TermWord, { case: nounCase = 'nom', plural = false }: TermOptions = {}): string => {
  const word = (typeof term === 'string' ? term : term.word).toLocaleLowerCase('tr');
  const accusative = typeof term === 'string' ? suggestAccusative(word) : term.accusative;
  if (plural) {
    const pluralStem = `${word}l${harmony2(lastVowel(accusative))}r`;
    return nounCase === 'nom' ? pluralStem : inflect({ word: pluralStem, accusative: suggestAccusative(pluralStem) }, { case: nounCase });
  }
  const high = lastChar(accusative);
  const low = harmony2(high);
  const vowelStem = accusative.slice(0, -1);
  const locative = `${word}${voiceless.includes(lastChar(word)) ? 't' : 'd'}${low}`;
  switch (nounCase) {
    case 'nom':
      return word;
    case 'acc':
      return accusative;
    case 'dat':
      return `${vowelStem}${low}`;
    case 'gen':
      return endsWithVowel(word) ? `${word}n${high}n` : `${vowelStem}${high}n`;
    case 'loc':
      return locative;
    case 'abl':
      return `${locative}n`;
  }
};

const capitalizeFirst = (text: string) => text.charAt(0).toLocaleUpperCase('tr') + text.slice(1);

export type Terms = Record<TermKey, (options?: TermOptions) => string>;

/** Builds the term formatter for a preset or a custom vocabulary; nothing given means the default preset. */
export const createTerms = (source: TerminologyPresetId | CustomTerminology | null | undefined): Terms => {
  const words: Record<TermKey, string | TermWord> =
    source && typeof source === 'object' ? source : terminologyPresets[source ?? defaultTerminologyPreset].words;
  const format = (key: TermKey) => (options: TermOptions = {}) => {
    const text = inflect(words[key], options);
    return options.capitalize ? capitalizeFirst(text) : text;
  };
  return { course: format('course'), topic: format('topic'), session: format('session') };
};
