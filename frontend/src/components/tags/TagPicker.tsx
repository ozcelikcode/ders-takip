import type { Tag } from '@study-tracker/contracts';
import { useTerms } from '../../hooks/useTerms';
import { useText } from '../../store/languageStore';

interface TagPickerProps {
  tags: Tag[];
  selected: number[];
  onChange: (tagIds: number[]) => void;
  disabled?: boolean;
}

/** Toggle buttons for the person's tags. */
export default function TagPicker({ tags, selected, onChange, disabled = false }: TagPickerProps) {
  const t = useTerms();
  const text = useText().tags;
  if (!tags.length) return <p className="text-xs text-(--muted)">{text.pickerEmpty(t)}</p>;
  return (
    <div role="group" aria-label={text.picker} className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              active ? 'border-(--solid) bg-(--solid) text-(--solid-text)' : 'border-(--line) text-(--muted) hover:bg-(--subtle) hover:text-(--text)'
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
