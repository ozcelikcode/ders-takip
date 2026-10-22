import { Timer } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { CreateSessionForm } from './sessionForm';
import { useText } from '../../store/languageStore';

const PRESETS = [
  { id: 'classic', workDuration: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4 },
  { id: 'long', workDuration: 45, shortBreak: 10, longBreak: 20, cyclesBeforeLongBreak: 3 },
  { id: 'max', workDuration: 60, shortBreak: 10, longBreak: 30, cyclesBeforeLongBreak: 2 },
] as const;

const FIELDS = [
  { name: 'workDuration', min: '5', max: '90' },
  { name: 'shortBreak', min: '1', max: '30' },
  { name: 'longBreak', min: '10', max: '60' },
  { name: 'cyclesBeforeLongBreak', min: '2', max: '8' },
] as const;

interface PomodoroSettingsFieldsProps {
  register: UseFormRegister<CreateSessionForm>;
  setValue: UseFormSetValue<CreateSessionForm>;
}

const PomodoroSettingsFields = ({ register, setValue }: PomodoroSettingsFieldsProps) => {
  const text = useText().pomodoro;
  return (
  <div className="rounded-lg border border-(--line) bg-(--subtle) p-4 space-y-3">
    <div className="flex items-center gap-2 text-(--text)">
      <Timer className="w-5 h-5" />
      <span className="font-medium">{text.settingsTitle}</span>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-medium text-(--muted)">{text.presetsTitle}</p>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map(({ id, ...preset }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setValue('pomodoroSettings.workDuration', preset.workDuration);
              setValue('pomodoroSettings.shortBreak', preset.shortBreak);
              setValue('pomodoroSettings.longBreak', preset.longBreak);
              setValue('pomodoroSettings.cyclesBeforeLongBreak', preset.cyclesBeforeLongBreak);
            }}
            className="btn btn-secondary text-xs"
          >
            {text.presets[id]}
          </button>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map(({ name, min, max }) => (
        <div key={name}>
          <label htmlFor={name} className="block text-xs font-medium text-(--muted) mb-1">
            {text.fields[name]}
          </label>
          <input
            id={name}
            {...register(`pomodoroSettings.${name}`, { valueAsNumber: true })}
            type="number"
            min={min}
            max={max}
            className="input text-sm"
          />
        </div>
      ))}
    </div>
  </div>
  );
};

export default PomodoroSettingsFields;
