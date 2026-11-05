import { sessionDurationLimits } from '@study-tracker/contracts';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CreateSessionForm } from './sessionForm';
import { endTimeLabel, rangeDurationLabel, type DurationMode } from './sessionRequest';
import { useText } from '../../store/languageStore';

interface SessionDurationFieldsProps {
  mode: DurationMode;
  onModeChange: (mode: DurationMode) => void;
  register: UseFormRegister<CreateSessionForm>;
  errors: FieldErrors<CreateSessionForm>;
  timezone: string;
  startDate: string | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
}

/**
 * The session's length: minutes, or an end time. One field and a one-line result, with a small switch between the two.
 */
const SessionDurationFields = ({
  mode,
  onModeChange,
  register,
  errors,
  timezone,
  startDate,
  startTime,
  endTime,
  duration,
}: SessionDurationFieldsProps & { duration: number | undefined }) => {
  const text = useText().planner;
  const minutes = duration || 60;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={mode === 'minutes' ? 'duration' : 'endTime'} className="text-sm font-medium">
          {mode === 'minutes' ? text.durationMinutes : text.endTimeRequired}
        </label>
        <div role="group" aria-label={text.durationMode} className="segmented-control">
          {(['minutes', 'timeRange'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => onModeChange(option)}
              className={`segment ${mode === option ? 'segment-active' : ''}`}
            >
              {option === 'minutes' ? text.minutesMode : text.rangeMode}
            </button>
          ))}
        </div>
      </div>
      {mode === 'minutes' ? (
        <input
          {...register('duration', { valueAsNumber: true })}
          type="number"
          id="duration"
          min={sessionDurationLimits.minMinutes}
          max={sessionDurationLimits.maxMinutes}
          step="any"
          className="input"
        />
      ) : (
        <input {...register('endTime')} type="time" id="endTime" className="input" />
      )}
      {mode === 'minutes' && errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>}
      {/* What the choice adds up to, in one quiet line. */}
      <p className="mt-1.5 text-xs text-(--muted)" aria-live="polite">
        {mode === 'minutes' ? (
          <>
            {text.endTime} <span className="font-medium tabular-nums text-(--text)">{endTimeLabel(startDate, startTime, minutes, timezone)}</span>
          </>
        ) : (
          <>
            {text.totalDuration}{' '}
            <span className="font-medium tabular-nums text-(--text)">{rangeDurationLabel(startDate, startTime, endTime, timezone)}</span>
          </>
        )}
      </p>
    </div>
  );
};

export default SessionDurationFields;
