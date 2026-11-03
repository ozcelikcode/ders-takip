import { useEffect, useId } from 'react';
import { useTags } from '../../hooks/useTags';
import { useText } from '../../store/languageStore';

interface TagFilterProps {
  value: number | null;
  onChange: (tagId: number | null) => void;
}

/** "All tags" or one of the person's tags; shown only once there are tags. */
export default function TagFilter({ value, onChange }: TagFilterProps) {
  const text = useText().tags;
  const id = useId();
  const tags = useTags();
  const known = tags.data?.tags;
  // A tag deleted while it filters the view would leave an empty list with no way back; drop the filter instead.
  useEffect(() => {
    if (value !== null && known && !known.some((tag) => tag.id === value)) onChange(null);
  }, [value, known, onChange]);
  if (!known?.length) return null;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">{text.filter}</label>
      <select id={id} className="input w-auto" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
        <option value="">{text.allTags}</option>
        {known.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select>
    </div>
  );
}
