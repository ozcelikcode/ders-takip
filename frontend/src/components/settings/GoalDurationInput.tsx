import { formatGoalMinutes, maxDailyGoalMinutes } from '../../utils/studyGoals';
import { useLanguage, useText } from '../../store/languageStore';

const dailyPresets = [30, 45, 60, 90, 120, 180, 240];

interface GoalDurationInputProps {
  id: string;
  label: string;
  /** Total minutes; 0 means no goal. */
  minutes: number;
  onChange: (minutes: number) => void;
  /** The largest goal; a day unless the goal spans a week. */
  maxMinutes?: number;
  /** Common durations offered as one-click choices. */
  presets?: readonly number[];
}

const part = (value: string) => (value === '' ? 0 : Number(value));

/** A goal as hours and/or minutes, with common durations one click away. */
export default function GoalDurationInput({ id, label, minutes, onChange, maxMinutes = maxDailyGoalMinutes, presets = dailyPresets }: GoalDurationInputProps) {
  const text = useText().settings;
  const language = useLanguage();
  const clamp = (value: number) => Math.min(maxMinutes, Math.max(0, Math.round(value)));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-hours`} className="sr-only">{text.goalHours(label)}</label>
          <input
            id={`${id}-hours`}
            type="number"
            inputMode="numeric"
            min={0}
            max={Math.floor(maxMinutes / 60)}
            className="input w-20"
            value={hours}
            onChange={(event) => onChange(clamp(part(event.target.value) * 60 + rest))}
          />
          <span aria-hidden="true" className="text-sm text-(--muted)">{text.hoursShort}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-minutes`} className="sr-only">{text.goalMinutes(label)}</label>
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
          <span aria-hidden="true" className="text-sm text-(--muted)">{text.minutesShort}</span>
        </div>
      </div>
      <div role="group" aria-label={text.goalPresets(label)} className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={minutes === preset}
            onClick={() => onChange(preset)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              minutes === preset
                ? 'border-(--solid) bg-(--solid) text-(--solid-text)'
                : 'border-(--line) text-(--muted) hover:bg-(--subtle) hover:text-(--text)'
            }`}
          >
            {formatGoalMinutes(preset, language)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The weekly goal follows from the daily goal and the active days; it is shown, not entered. */
export function WeeklyGoalSummary({ dailyMinutes, activeDays }: { dailyMinutes: number; activeDays: number }) {
  const text = useText().settings;
  const language = useLanguage();
  return (
    <p aria-live="polite" className="rounded-lg border border-(--line) bg-(--subtle) px-4 py-3 text-sm">
      <span className="text-(--muted)">{text.weeklyGoal}</span>
      {dailyMinutes === 0 ? (
        <span className="font-medium">{text.noGoal}</span>
      ) : activeDays === 0 ? (
        <span className="font-medium">{text.noActiveDays}</span>
      ) : (
        <>
          <span className="font-medium">{formatGoalMinutes(Math.min(dailyMinutes * activeDays, 168 * 60), language)}</span>
          <span className="text-(--muted)">{text.weeklyGoalDetail(activeDays, formatGoalMinutes(dailyMinutes, language))}</span>
        </>
      )}
    </p>
  );
}
