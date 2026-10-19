import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { CreateSessionForm } from './sessionForm';

// Session identity colors are independent of the neutral dialog surfaces.
const SESSION_COLORS = [
  { name: 'Gök Mavisi', value: '#60A5FA' },
  { name: 'Nane Yeşili', value: '#34D399' },
  { name: 'Lavanta', value: '#A78BFA' },
  { name: 'Mercan', value: '#F87171' },
  { name: 'Kayısı', value: '#FBBF24' },
  { name: 'Şakayık', value: '#F472B6' },
  { name: 'Safir', value: '#818CF8' },
  { name: 'Deniz', value: '#2DD4BF' },
  { name: 'Beton', value: '#9CA3AF' },
  { name: 'Ayçiçeği', value: '#FCD34D' },
  { name: 'Okyanus', value: '#38BDF8' },
  { name: 'Çimen', value: '#4ADE80' },
];

interface SessionColorPickerProps {
  selected: string | undefined;
  register: UseFormRegister<CreateSessionForm>;
  setValue: UseFormSetValue<CreateSessionForm>;
}

const SessionColorPicker = ({ selected, register, setValue }: SessionColorPickerProps) => (
  <div>
    <label className="block text-sm font-medium mb-3">
      Renk Seçimi
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
              ? 'border-transparent ring-2 ring-[var(--solid)] ring-offset-2 ring-offset-[var(--surface)]'
              : 'border-[var(--line)] hover:ring-2 hover:ring-[var(--line)] hover:ring-offset-2 hover:ring-offset-[var(--surface)]'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
          aria-label={`${color.name} seans rengi`}
          aria-pressed={selected === color.value}
        />
      ))}
    </div>
  </div>
);

export default SessionColorPicker;
