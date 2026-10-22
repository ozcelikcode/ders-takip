import { sessionDurationLimits } from '@study-tracker/contracts';
import { Calendar, Timer } from 'lucide-react';
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

const modeButtonClass = (active: boolean) =>
  `p-3 rounded-md border transition-colors duration-150 ${
    active
      ? 'border-(--solid) bg-(--subtle) text-(--text)'
      : 'border-(--line) text-(--muted) hover:bg-(--subtle)'
  }`;

const SessionDurationFields = ({
  mode,
  onModeChange,
  register,
  errors,
  timezone,
  startDate,
  startTime,
  endTime,
}: SessionDurationFieldsProps) => {
  const text = useText().planner;
  return (
  <>
    <div>
      <label className="block text-sm font-medium mb-3">
        {text.durationMode}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onModeChange('minutes')} className={modeButtonClass(mode === 'minutes')}>
          <div className="flex items-center justify-center gap-2">
            <Timer className={`w-4 h-4 ${mode === 'minutes' ? 'text-(--text)' : 'text-(--muted)'}`} />
            <span className="font-medium text-sm">{text.minutesMode}</span>
          </div>
        </button>
        <button type="button" onClick={() => onModeChange('timeRange')} className={modeButtonClass(mode === 'timeRange')}>
          <div className="flex items-center justify-center gap-2">
            <Calendar className={`w-4 h-4 ${mode === 'timeRange' ? 'text-(--text)' : 'text-(--muted)'}`} />
            <span className="font-medium text-sm">{text.rangeMode}</span>
          </div>
        </button>
      </div>
    </div>

    {mode === 'minutes' && (
      <div>
        <label htmlFor="duration" className="block text-sm font-medium mb-2">
          {text.durationMinutes}
        </label>
        <input
          {...register('duration', { valueAsNumber: true })}
          type="number"
          id="duration"
          min={sessionDurationLimits.minMinutes}
          max={sessionDurationLimits.maxMinutes}
          step="any"
          className="input"
        />
        {errors.duration && (
          <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
        )}
      </div>
    )}

    {mode === 'timeRange' && (
      <div className="space-y-3">
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium mb-2">
            {text.endTimeRequired}
          </label>
          <input {...register('endTime')} type="time" id="endTime" className="input" />
        </div>

        <div className="bg-(--subtle) rounded-lg p-3 border border-(--line)">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{text.totalDuration}</span>
            <span className="text-base font-medium tabular-nums">
              {rangeDurationLabel(startDate, startTime, endTime, timezone)}
            </span>
          </div>
          <p className="mt-1 text-xs text-(--muted)">
            {text.totalDurationHint}
          </p>
        </div>
      </div>
    )}
  </>
  );
};

/** Read-only end-time summary shown below the session type in minutes mode. */
export const EndTimeSummary = ({
  timezone,
  startDate,
  startTime,
  duration,
}: Pick<SessionDurationFieldsProps, 'timezone' | 'startDate' | 'startTime'> & { duration: number | undefined }) => {
  const minutes = duration || 60;
  const text = useText().planner;
  return (
    <div className="bg-(--subtle) rounded-lg p-3 border border-(--line)">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{text.endTime}</span>
        <span className="text-base font-medium tabular-nums">
          {endTimeLabel(startDate, startTime, minutes, timezone)}
        </span>
      </div>
      <p className="text-xs text-(--muted) mt-1.5 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        {text.startPlus(minutes)}
      </p>
    </div>
  );
};

export default SessionDurationFields;
