import { onboardingCourseLimit, type Terms } from '@study-tracker/contracts';
import { FolderOpen, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { appLocale } from '../../lib/locale';
import { addCourseName, removeCourseName, suggestedCourseNames, type OnboardingDraft } from './onboardingModel';

interface FirstRecordsStepProps {
  id: string;
  draft: OnboardingDraft;
  terms: Terms;
  onChange: (draft: OnboardingDraft) => void;
  onError: (message: string | null) => void;
}

const tile = 'relative flex aspect-square flex-col rounded-xl border p-4';

/** The first records as square tiles: typed in place, picked from suggestions, removed one by one. */
export default function FirstRecordsStep({ id, draft, terms, onChange, onError }: FirstRecordsStepProps) {
  const [adding, setAdding] = useState(() => draft.pendingCourseName !== '');
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const courseWord = terms.course({ capitalize: true });
  const full = draft.courseNames.length >= onboardingCourseLimit;
  const suggestions = full ? [] : suggestedCourseNames(draft);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const add = (value: string) => {
    const result = addCourseName(draft, value);
    if ('error' in result) { onError(result.error); return false; }
    onError(null);
    onChange(result.draft);
    return true;
  };
  const name = draft.pendingCourseName;
  const setName = (pendingCourseName: string) => onChange({ ...draft, pendingCourseName });
  const submitTyped = () => {
    const result = addCourseName(draft, name);
    if ('error' in result) { onError(result.error); return; }
    onError(null);
    onChange({ ...result.draft, pendingCourseName: '' });
    // Keep the editor open for the next name unless the list is now full.
    if (draft.courseNames.length + 1 >= onboardingCourseLimit) setAdding(false);
    else inputRef.current?.focus();
  };
  const cancel = () => { setAdding(false); setName(''); onError(null); requestAnimationFrame(() => addButtonRef.current?.focus()); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter must add the tile, not submit the whole wizard form.
    if (event.key === 'Enter') { event.preventDefault(); submitTyped(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
  };
  const remove = (value: string) => {
    onError(null);
    onChange(removeCourseName(draft, value));
    requestAnimationFrame(() => (inputRef.current ?? addButtonRef.current)?.focus());
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={`${id}-category`} className="mb-2 block text-sm font-medium">Kategori</label>
        <div className="relative">
          <FolderOpen aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input id={`${id}-category`} className="input pl-9" maxLength={100} value={draft.categoryName} onChange={(event) => onChange({ ...draft, categoryName: event.target.value })} />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Yalnız sana görünen kişisel bir kategori olarak oluşturulur; aynı adlı ortak bir kategori varsa o kullanılır.</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`${id}-records`} className="text-sm font-medium">{terms.course({ plural: true, capitalize: true })}</h2>
          <span className="text-xs text-[var(--muted)]">{draft.courseNames.length} / {onboardingCourseLimit}</span>
        </div>
        <ul aria-labelledby={`${id}-records`} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {draft.courseNames.map((courseName) => (
            <li key={courseName} className={`${tile} justify-between border-[var(--line)] bg-[var(--surface)]`}>
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--subtle)] text-base font-semibold">
                {courseName.charAt(0).toLocaleUpperCase(appLocale)}
              </span>
              <span className="line-clamp-3 break-words pr-1 text-sm font-medium">{courseName}</span>
              <button type="button" aria-label={`${courseName} kaldır`} onClick={() => remove(courseName)} className="icon-button absolute right-2 top-2">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!full && (
            <li className="aspect-square">
              {adding ? (
                <div className={`${tile} h-full justify-between gap-2 border-dashed border-[var(--solid)] p-3`}>
                  <label htmlFor={`${id}-new`} className="text-xs font-medium text-[var(--muted)]">Yeni {terms.course()}</label>
                  <input
                    ref={inputRef}
                    id={`${id}-new`}
                    className="input"
                    maxLength={100}
                    value={name}
                    placeholder={suggestions[0]}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={onKeyDown}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary flex-1 px-2" onClick={submitTyped}>Ekle</button>
                    <button type="button" className="btn btn-secondary px-2" onClick={cancel} aria-label="Eklemeyi bırak">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  ref={addButtonRef}
                  type="button"
                  onClick={() => { setAdding(true); onError(null); }}
                  className={`${tile} h-full w-full items-center justify-center gap-2 border-dashed border-[var(--line)] text-sm text-[var(--muted)] transition-colors hover:border-[var(--solid)] hover:text-[var(--text)]`}
                >
                  <Plus aria-hidden="true" className="h-5 w-5" />
                  {courseWord} ekle
                </button>
              )}
            </li>
          )}
        </ul>
        {draft.courseNames.length === 0 && (
          <p className="mt-3 text-xs text-[var(--muted)]">Boş bırakırsan bu adım atlanır; {terms.course({ plural: true })} sonra da eklenebilir.</p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--muted)]">Hızlı ekle</p>
          <div role="group" aria-label="Önerilen adlar" className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                aria-label={`${suggestion} ekle`}
                onClick={() => add(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--subtle)] hover:text-[var(--text)]"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
