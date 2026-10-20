import { formatGoalMinutes, maxDailyGoalMinutes } from '../../utils/studyGoals';

const presets = [30, 45, 60, 90, 120, 180, 240];

interface GoalDurationInputProps {
  id: string;
  label: string;
  /** Total minutes; 0 means no goal. */
  minutes: number;
  onChange: (minutes: number) => void;
}

const clamp = (minutes: number) => Math.min(maxDailyGoalMinutes, Math.max(0, Math.round(minutes)));
const part = (value: string) => (value === '' ? 0 : Number(value));

/** A daily goal as hours and/or minutes, with common durations one click away. */
export default function GoalDurationInput({ id, label, minutes, onChange }: GoalDurationInputProps) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-hours`} className="sr-only">{label} (saat)</label>
          <input
            id={`${id}-hours`}
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            className="input w-20"
            value={hours}
            onChange={(event) => onChange(clamp(part(event.target.value) * 60 + rest))}
          />
          <span aria-hidden="true" className="text-sm text-[var(--muted)]">sa</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-minutes`} className="sr-only">{label} (dakika)</label>
          <input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            step={5}
            className="input w-20"
            value={rest}
            onChange={(event) => onChange(clamp(hours * 60 + Math.min(59, part(event.target.value))))}
          />
          <span aria-hidden="true" className="text-sm text-[var(--muted)]">dk</span>
        </div>
      </div>
      <div role="group" aria-label={`${label}: hazır süreler`} className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={minutes === preset}
            onClick={() => onChange(preset)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              minutes === preset
                ? 'border-[var(--solid)] bg-[var(--solid)] text-[var(--solid-text)]'
                : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]'
            }`}
          >
            {formatGoalMinutes(preset)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The weekly goal follows from the daily goal and the active days; it is shown, not entered. */
export function WeeklyGoalSummary({ dailyMinutes, activeDays }: { dailyMinutes: number; activeDays: number }) {
  return (
    <p aria-live="polite" className="rounded-lg border border-[var(--line)] bg-[var(--subtle)] px-4 py-3 text-sm">
      <span className="text-[var(--muted)]">Haftalık hedef: </span>
      {dailyMinutes === 0 ? (
        <span className="font-medium">Hedef yok</span>
      ) : activeDays === 0 ? (
        <span className="font-medium">Aktif gün seçilmedi</span>
      ) : (
        <>
          <span className="font-medium">{formatGoalMinutes(Math.min(dailyMinutes * activeDays, 168 * 60))}</span>
          <span className="text-[var(--muted)]"> · {activeDays} aktif gün × {formatGoalMinutes(dailyMinutes)}</span>
        </>
      )}
    </p>
  );
}
