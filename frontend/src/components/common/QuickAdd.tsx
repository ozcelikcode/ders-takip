import { Plus } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useText } from '../../store/languageStore';

interface QuickAddProps {
  /** The closed link, e.g. "New project". */
  label: string;
  /** The name field's label, read by screen readers and shown as its placeholder. */
  nameLabel: string;
  /** Creates the item; resolves true when it was saved, so the row closes. */
  onAdd: (name: string) => Promise<boolean>;
  /** More fields the new item needs, shown beside the name. */
  children?: ReactNode;
  disabled?: boolean;
}

/**
 * A "+ New …" link that opens a one-line form right where the item is chosen, so a missing project or category
 * never sends the person to another page. It lives inside other forms: Enter adds here and never submits the outer form.
 */
export default function QuickAdd({ label, nameLabel, onAdd, children, disabled = false }: QuickAddProps) {
  const common = useText().common;
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    setName('');
    // Back to the link, so the keyboard does not lose its place.
    requestAnimationFrame(() => opener.current?.focus());
  };
  const add = async () => {
    if (!name.trim() || pending) return;
    setPending(true);
    try {
      if (await onAdd(name.trim())) close();
    } finally {
      setPending(false);
    }
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void add();
    } else if (event.key === 'Escape') {
      // Only the row closes; a dialog around it stays open.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  if (!open)
    return (
      <button
        ref={opener}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-(--muted) hover:text-(--text) disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </button>
    );

  return (
    <div role="group" aria-label={label} className="mt-2 space-y-2 rounded-md border border-dashed border-(--line) p-3">
      <label htmlFor={id} className="sr-only">{nameLabel}</label>
      <input
        id={id}
        className="input"
        value={name}
        placeholder={nameLabel}
        autoFocus
        maxLength={100}
        disabled={pending}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={keys}
      />
      {children}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={close}>
          {common.cancel}
        </button>
        <button type="button" className="btn btn-primary" disabled={pending || !name.trim()} onClick={() => void add()}>
          {pending ? common.saving : common.add}
        </button>
      </div>
    </div>
  );
}
