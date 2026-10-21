import { useTerms } from '../../hooks/useTerms';
import { BookOpen, Coffee, Target } from 'lucide-react';

export type SessionCategory = 'course' | 'break' | 'custom';

const CATEGORIES = [
  { value: 'course', Icon: BookOpen },
  { value: 'break', Icon: Coffee },
  { value: 'custom', Icon: Target },
] as const;

interface SessionCategoryPickerProps {
  value: SessionCategory;
  onChange: (value: SessionCategory) => void;
}

const SessionCategoryPicker = ({ value, onChange }: SessionCategoryPickerProps) => {
  const t = useTerms();
  const labels: Record<SessionCategory, string> = {
    course: `${t.course({ capitalize: true })} çalışması`,
    break: 'Mola',
    custom: 'Özel',
  };
  return (
  <div>
    <label className="block text-sm font-medium mb-3">
      Çalışma Türü *
    </label>
    <div className="grid grid-cols-3 gap-3">
      {CATEGORIES.map(({ value: category, Icon }) => (
        <button
          key={category}
          type="button"
          aria-pressed={value === category}
          onClick={() => onChange(category)}
          className={`p-4 rounded-md border transition-colors duration-150 ${
            value === category
              ? 'border-(--solid) bg-(--subtle) text-(--text)'
              : 'border-(--line) text-(--muted) hover:bg-(--subtle)'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Icon
              className={`w-6 h-6 ${value === category ? ' ' : 'text-(--muted)'}`}
            />
            <span className="font-medium text-xs">{labels[category]}</span>
          </div>
        </button>
      ))}
    </div>
  </div>
  );
};

export default SessionCategoryPicker;
