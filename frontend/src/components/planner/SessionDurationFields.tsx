import { sessionDurationLimits } from '@study-tracker/contracts';
import { Calendar, Timer } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CreateSessionForm } from './sessionForm';
import { endTimeLabel, rangeDurationLabel, type DurationMode } from './sessionRequest';

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
      ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
      : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)]'
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
}: SessionDurationFieldsProps) => (
  <>
    <div>
      <label className="block text-sm font-medium mb-3">
        Süre Seçim Tipi
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => onModeChange('minutes')} className={modeButtonClass(mode === 'minutes')}>
          <div className="flex items-center justify-center gap-2">
            <Timer className={`w-4 h-4 ${mode === 'minutes' ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`} />
            <span className="font-medium text-sm">Dakika</span>
          </div>
        </button>
        <button type="button" onClick={() => onModeChange('timeRange')} className={modeButtonClass(mode === 'timeRange')}>
          <div className="flex items-center justify-center gap-2">
            <Calendar className={`w-4 h-4 ${mode === 'timeRange' ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`} />
            <span className="font-medium text-sm">Saat Aralığı</span>
          </div>
        </button>
      </div>
    </div>

    {mode === 'minutes' && (
      <div>
        <label htmlFor="duration" className="block text-sm font-medium mb-2">
          Süre (dakika) *
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
            Bitiş Saati *
          </label>
          <input {...register('endTime')} type="time" id="endTime" className="input" />
        </div>

        <div className="bg-[var(--subtle)] rounded-lg p-3 border border-[var(--line)]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Toplam süre:</span>
            <span className="text-base font-medium tabular-nums">
              {rangeDurationLabel(startDate, startTime, endTime, timezone)}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Başlangıç ve bitiş saatine göre otomatik hesaplanır
          </p>
        </div>
      </div>
    )}
  </>
);

/** Read-only end-time summary shown below the session type in minutes mode. */
export const EndTimeSummary = ({
  timezone,
  startDate,
  startTime,
  duration,
}: Pick<SessionDurationFieldsProps, 'timezone' | 'startDate' | 'startTime'> & { duration: number | undefined }) => {
  const minutes = duration || 60;
  return (
    <div className="bg-[var(--subtle)] rounded-lg p-3 border border-[var(--line)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Bitiş saati:</span>
        <span className="text-base font-medium tabular-nums">
          {endTimeLabel(startDate, startTime, minutes, timezone)}
        </span>
      </div>
      <p className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1">
        <Timer className="w-3 h-3" />
        Başlangıç + {minutes} dakika
      </p>
    </div>
  );
};

export default SessionDurationFields;
