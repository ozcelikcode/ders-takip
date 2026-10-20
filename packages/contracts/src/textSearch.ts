/**
 * Search ignores case and Turkish letter forms: dotted/dotless i and the letters with marks fold to plain Latin,
 * so "sinav" finds "Sınav" and "istanbul" finds "İSTANBUL". The server applies the same pairs in SQL, so both
 * sides must fold with this list. Other accented letters are left as they are.
 */
export const searchFoldPairs: readonly (readonly [string, string])[] = [
  ['İ', 'i'], ['I', 'i'], ['ı', 'i'],
  ['Ş', 's'], ['ş', 's'],
  ['Ğ', 'g'], ['ğ', 'g'],
  ['Ü', 'u'], ['ü', 'u'],
  ['Ö', 'o'], ['ö', 'o'],
  ['Ç', 'c'], ['ç', 'c'],
];

/** Folds text for matching; ASCII lower-casing only, like SQLite `lower()`. */
export const foldSearchText = (text: string): string =>
  searchFoldPairs.reduce((value, [from, to]) => value.split(from).join(to), text).replace(/[A-Z]/g, (char) => char.toLowerCase());

/** Whether `text` contains `query` once both are folded. */
export const matchesSearch = (text: string | null | undefined, query: string): boolean =>
  !!text && foldSearchText(text).includes(foldSearchText(query.trim()));
