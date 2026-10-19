import type { WeekStart } from '@study-tracker/contracts';
import { orderedWeekdays, weekdayLabel } from '../../lib/locale';

interface WeekdayPickerProps {
  label: string;
  value: number[];
  weekStart: WeekStart;
  onChange: (days: number[]) => void;
}

/** Toggle buttons for JS weekdays (0 = Sunday), listed from the chosen week start. */
export default function WeekdayPicker({ label, value, weekStart, onChange }: WeekdayPickerProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {orderedWeekdays(weekStart).map((day) => {
        const active = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((id) => id !== day) : [...value, day])}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? 'border-[var(--solid)] bg-[var(--solid)] text-[var(--solid-text)]'
                : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]'
            }`}
          >
            {weekdayLabel(day)}
          </button>
        );
      })}
    </div>
  );
}
