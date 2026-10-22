import { useTerms } from './../../hooks/useTerms';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { CreateSessionForm } from './sessionForm';
import { useText } from '../../store/languageStore';

// Session identity colors are independent of the neutral dialog surfaces.
const SESSION_COLORS = [
  { id: 'sky', value: '#60A5FA' },
  { id: 'mint', value: '#34D399' },
  { id: 'lavender', value: '#A78BFA' },
  { id: 'coral', value: '#F87171' },
  { id: 'apricot', value: '#FBBF24' },
  { id: 'peony', value: '#F472B6' },
  { id: 'sapphire', value: '#818CF8' },
  { id: 'sea', value: '#2DD4BF' },
  { id: 'concrete', value: '#9CA3AF' },
  { id: 'sunflower', value: '#FCD34D' },
  { id: 'ocean', value: '#38BDF8' },
  { id: 'grass', value: '#4ADE80' },
] as const;

interface SessionColorPickerProps {
  selected: string | undefined;
  register: UseFormRegister<CreateSessionForm>;
  setValue: UseFormSetValue<CreateSessionForm>;
}

const SessionColorPicker = ({ selected, register, setValue }: SessionColorPickerProps) => {
  const t = useTerms();
  const text = useText().planner;
  return (
  <div>
    <label className="block text-sm font-medium mb-3">
      {text.colorTitle}
    </label>
    <input type="hidden" {...register('color')} />
    <div className="grid grid-cols-6 gap-2">
      {SESSION_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() =>
            setValue('color', color.value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          className={`h-8 w-8 rounded-full border transition-shadow ${
            selected === color.value
              ? 'border-transparent ring-2 ring-(--solid) ring-offset-2 ring-offset-(--surface)'
              : 'border-(--line) hover:ring-2 hover:ring-(--line) hover:ring-offset-2 hover:ring-offset-(--surface)'
          }`}
          style={{ backgroundColor: color.value }}
          title={text.colors[color.id]}
          aria-label={text.colorLabel(t, text.colors[color.id])}
          aria-pressed={selected === color.value}
        />
      ))}
    </div>
  </div>
  );
};

export default SessionColorPicker;
