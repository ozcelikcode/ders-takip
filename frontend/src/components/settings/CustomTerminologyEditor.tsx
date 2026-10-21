import {
  customTerminologySchema,
  inflect,
  normalizeTermWord,
  suggestAccusative,
  termKeys,
  type CustomTerminology,
  type TermKey,
} from '@study-tracker/contracts';

interface CustomTerminologyEditorProps {
  idPrefix: string;
  /** Unvalidated words as typed; the parent saves only what passes `customTerminologySchema`. */
  value: CustomTerminology;
  onChange: (value: CustomTerminology) => void;
}

const termLabels: Record<TermKey, { title: string; hint: string }> = {
  course: { title: 'Ana kayıt', hint: 'Takip edilen büyük birim (proje, ders, hedef…)' },
  topic: { title: 'Alt kayıt', hint: 'Ana kaydın parçaları (görev, konu, adım…)' },
  session: { title: 'Çalışma', hint: 'Takvimdeki zaman bloğu (seans, oturum…)' },
};

/** Field-level messages from the shared schema, keyed like `course.word`. */
const fieldErrors = (value: CustomTerminology) => {
  const result = customTerminologySchema.safeParse(value);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

const forms = (value: CustomTerminology[TermKey]) =>
  [
    inflect(value, {}),
    inflect(value, { case: 'acc' }),
    inflect(value, { case: 'dat' }),
    inflect(value, { case: 'gen' }),
    inflect(value, { case: 'loc' }),
    inflect(value, { plural: true }),
  ].join(' · ');

/** Lets a person type their own word for each concept and check every form it will take. */
export default function CustomTerminologyEditor({ idPrefix, value, onChange }: CustomTerminologyEditorProps) {
  const errors = fieldErrors(value);
  const update = (key: TermKey, field: 'word' | 'accusative', text: string) => {
    const current = value[key];
    const next = normalizeTermWord(text);
    // Keep the accusative in step with the word until the person corrects it by hand.
    const followsWord = field === 'word' && current.accusative === suggestAccusative(current.word);
    const term =
      field === 'word'
        ? { word: next, accusative: followsWord ? suggestAccusative(next) : current.accusative }
        : { ...current, accusative: next };
    onChange({ ...value, [key]: term });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-(--muted)">
        Her kavram için tek kelime yaz. Ekler &quot;-ı&quot; hâlinden türetilir: kelime ek alınca değişiyorsa
        (kitap → kitabı, saat → saati) o alanı düzelt.
      </p>
      {termKeys.map((key) => {
        const wordError = errors[`${key}.word`];
        const accusativeError = errors[`${key}.accusative`];
        const valid = !wordError && !accusativeError;
        return (
          <fieldset key={key} className="space-y-3 rounded-lg border border-(--line) p-4">
            <legend className="px-1 text-sm font-medium">{termLabels[key].title}</legend>
            <p className="text-xs text-(--muted)">{termLabels[key].hint}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['word', 'accusative'] as const).map((field) => {
                const id = `${idPrefix}-${key}-${field}`;
                const error = field === 'word' ? wordError : accusativeError;
                return (
                  <div key={field}>
                    <label htmlFor={id} className="mb-1 block text-sm">
                      {field === 'word' ? 'Kelime' : '"-ı" hâli'}
                    </label>
                    <input
                      id={id}
                      className="input"
                      value={value[key][field]}
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={!!error}
                      aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(event) => update(key, field, event.target.value)}
                    />
                    {error && (
                      <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {valid && <p className="text-xs text-(--muted)">Biçimler: {forms(value[key])}</p>}
          </fieldset>
        );
      })}
    </div>
  );
}
