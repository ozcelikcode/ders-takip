import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useText } from '../../store/languageStore';

export interface SelectOption<V extends string | number> {
  value: V;
  label: string;
  /** Optional leading mark, such as an icon or a colour dot. */
  icon?: ReactNode;
  disabled?: boolean;
}

interface SelectProps<V extends string | number> {
  /** The control's id, so a `<label htmlFor>` names it. */
  id?: string | undefined;
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (value: V) => void;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  'aria-label'?: string | undefined;
  'aria-describedby'?: string | undefined;
  className?: string | undefined;
  /** Long lists (time zones) get a text field that filters the options. */
  searchable?: boolean;
}

// The open list floats above dialogs (z-50/60) and follows the site's panel look instead of the browser's menu.
const listClass =
  'z-70 min-w-44 overflow-auto rounded-md border bg-(--surface) p-1 text-sm shadow-lg outline-none [--anchor-gap:4px] [--anchor-max-height:18rem] empty:invisible';
const optionClass =
  'group flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-(--text) data-disabled:opacity-50 data-focus:bg-(--subtle)';
const mark = <Check className="ml-auto h-4 w-4 shrink-0 invisible group-data-selected:visible" aria-hidden="true" />;

/** Maps a form's field props (id, invalid, description) onto a Select. */
export const selectField = (field: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => ({
  id: field.id,
  invalid: field['aria-invalid'],
  'aria-describedby': field['aria-describedby'],
});

/** The site's single-choice field: a button that opens a styled list, keyboard and screen-reader ready (Headless UI). */
export default function Select<V extends string | number>({
  id,
  value,
  options,
  onChange,
  disabled,
  invalid,
  className = '',
  searchable = false,
  ...aria
}: SelectProps<V>) {
  const { noMatches, showOptions } = useText().common;
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const field = `input flex items-center gap-2 text-left ${invalid ? 'input-error' : ''} ${className}`;

  if (searchable) {
    const needle = query.trim().toLocaleLowerCase();
    const shown = needle ? options.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : options;
    return (
      <Combobox
        value={value}
        onChange={(next: V | null) => {
          if (next !== null) onChange(next);
        }}
        onClose={() => setQuery('')}
        disabled={!!disabled}
        immediate
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className={`${field} pr-9`}
            aria-invalid={invalid || undefined}
            aria-label={aria['aria-label']}
            aria-describedby={aria['aria-describedby']}
            displayValue={(current: V) => options.find((option) => option.value === current)?.label ?? ''}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-(--muted)" aria-label={showOptions}>
            <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
          </ComboboxButton>
        </div>
        <ComboboxOptions anchor="bottom start" className={`${listClass} w-(--input-width)`}>
          {shown.length === 0 ? (
            <div className="px-2 py-1.5 text-(--muted)">{noMatches}</div>
          ) : (
            shown.map((option) => (
              <ComboboxOption key={option.value} value={option.value} disabled={!!option.disabled} className={optionClass}>
                {option.icon}
                <span className="truncate">{option.label}</span>
                {mark}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    );
  }

  return (
    <Listbox value={value} onChange={onChange} disabled={!!disabled}>
      <ListboxButton
        id={id}
        className={`${field} disabled:opacity-60`}
        aria-invalid={invalid || undefined}
        aria-label={aria['aria-label']}
        aria-describedby={aria['aria-describedby']}
      >
        {selected?.icon}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-(--muted)" aria-hidden="true" />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" className={`${listClass} w-(--button-width)`}>
        {options.map((option) => (
          <ListboxOption key={option.value} value={option.value} disabled={!!option.disabled} className={optionClass}>
            {option.icon}
            <span className="truncate">{option.label}</span>
            {mark}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
