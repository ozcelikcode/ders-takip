import { useEffect, useId } from 'react';
import { useTags } from '../../hooks/useTags';
import { useText } from '../../store/languageStore';
import Select from '../common/Select';

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
      <Select
        id={id}
        className="w-auto min-w-40"
        value={value ?? 0}
        options={[{ value: 0, label: text.allTags }, ...known.map((tag) => ({ value: tag.id, label: tag.name }))]}
        onChange={(tagId) => onChange(tagId || null)}
      />
    </div>
  );
}
