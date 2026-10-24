import {
  customTerminologySchema,
  englishArticles,
  inflect,
  inflectEnglish,
  normalizeTermWord,
  suggestAccusative,
  suggestArticle,
  suggestPlural,
  termKeys,
  type CustomTerminology,
  type EnglishArticle,
  type EnglishTermWord,
  type TermKey,
  type TermWord,
} from '@study-tracker/contracts';
import { useText } from '../../store/languageStore';
import { issueMessage } from '../../lib/messages';

interface CustomTerminologyEditorProps {
  idPrefix: string;
  /** Unvalidated words as typed, in their own language; the parent saves only what passes `customTerminologySchema`. */
  value: CustomTerminology;
  onChange: (value: CustomTerminology) => void;
}

/** Field-level messages from the shared schema, keyed like `course.word`. */
const fieldErrors = (value: CustomTerminology) => {
  const result = customTerminologySchema.safeParse(value);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issueMessage(issue.message)]));
};

const turkishForms = (term: TermWord) =>
  [
    inflect(term, {}),
    inflect(term, { case: 'acc' }),
    inflect(term, { case: 'dat' }),
    inflect(term, { case: 'gen' }),
    inflect(term, { case: 'loc' }),
    inflect(term, { plural: true }),
  ].join(' · ');
const englishForms = (term: EnglishTermWord) =>
  [inflectEnglish(term, { article: true }), inflectEnglish(term, { plural: true })].join(' · ');

// A derived field follows the word until the person corrects it by hand.
const turkishTerm = (current: TermWord, field: keyof TermWord, typed: string): TermWord =>
  field === 'word'
    ? { word: typed, accusative: current.accusative === suggestAccusative(current.word) ? suggestAccusative(typed) : current.accusative }
    : { ...current, accusative: typed };
const englishTerm = (current: EnglishTermWord, field: keyof EnglishTermWord, typed: string): EnglishTermWord =>
  field === 'word'
    ? {
        word: typed,
        plural: current.plural === suggestPlural(current.word) ? suggestPlural(typed) : current.plural,
        article: current.article === suggestArticle(current.word) ? suggestArticle(typed) : current.article,
      }
    : field === 'article'
      ? { ...current, article: typed as EnglishArticle }
      : { ...current, plural: typed };

/** Lets a person type their own word for each concept in the words' language and check every form it will take. */
export default function CustomTerminologyEditor({ idPrefix, value, onChange }: CustomTerminologyEditorProps) {
  const text = useText().settings;
  const errors = fieldErrors(value);
  const update = (key: TermKey, field: string, typed: string) => {
    if (value.language === 'en') {
      const next = field === 'article' ? typed : normalizeTermWord(typed, 'en');
      onChange({ ...value, [key]: englishTerm(value[key], field as keyof EnglishTermWord, next) });
    } else {
      onChange({ ...value, [key]: turkishTerm(value[key], field as keyof TermWord, normalizeTermWord(typed, 'tr')) });
    }
  };
  const fields =
    value.language === 'en'
      ? ([['word', text.word], ['plural', text.plural], ['article', text.article]] as const)
      : ([['word', text.word], ['accusative', text.accusative]] as const);
  const fieldValue = (key: TermKey, field: string) =>
    (value[key] as Record<string, string>)[field] ?? '';

  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        {value.language === 'en' ? text.englishWordsHint : text.customWordsHint}
      </p>
      {termKeys.map((key) => {
        const valid = fields.every(([field]) => !errors[`${key}.${field}`]);
        return (
          <fieldset key={key} className="space-y-3 rounded-lg border border-(--line) p-4">
            <legend className="px-1 text-sm font-medium">{text.terms[key].title}</legend>
            <p className="text-xs text-(--muted)">{text.terms[key].hint}</p>
            <div className={`grid gap-3 ${fields.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {fields.map(([field, label]) => {
                const id = `${idPrefix}-${key}-${field}`;
                const error = errors[`${key}.${field}`];
                const described = { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined };
                return (
                  <div key={field}>
                    <label htmlFor={id} className="mb-1 block text-sm">
                      {label}
                    </label>
                    {field === 'article' ? (
                      <select id={id} className="input" value={fieldValue(key, field)} {...described} onChange={(event) => update(key, field, event.target.value)}>
                        {englishArticles.map((article) => (
                          <option key={article} value={article}>
                            {article}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        className="input"
                        value={fieldValue(key, field)}
                        lang={value.language}
                        autoComplete="off"
                        spellCheck={false}
                        {...described}
                        onChange={(event) => update(key, field, event.target.value)}
                      />
                    )}
                    {error && (
                      <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {valid && (
              <p className="text-xs text-(--muted)" lang={value.language}>
                {text.forms(value.language === 'en' ? englishForms(value[key]) : turkishForms(value[key]))}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
