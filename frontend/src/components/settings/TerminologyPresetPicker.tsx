import { createTerms, terminologyPresetIds, terminologyPresets, type TerminologyPresetId } from '@study-tracker/contracts';

interface TerminologyPresetPickerProps {
  name: string;
  value: TerminologyPresetId | null;
  onChange: (preset: TerminologyPresetId | null) => void;
  /** Offers a "follow the site" choice (value null) that resolves to this preset. */
  siteDefault?: TerminologyPresetId;
}

const example = (preset: TerminologyPresetId) => {
  const terms = createTerms(preset);
  return `${terms.course({ capitalize: true })} → ${terms.topic({ capitalize: true })} · ${terms.session({ capitalize: true })}`;
};

/** Radio cards for the vocabulary presets, each with its example words. */
export default function TerminologyPresetPicker({ name, value, onChange, siteDefault }: TerminologyPresetPickerProps) {
  const options: { id: TerminologyPresetId | null; label: string; description: string; preview: TerminologyPresetId }[] = [
    ...(siteDefault
      ? [{ id: null, label: 'Site varsayılanı', description: `Yöneticinin seçtiği seti izler: ${terminologyPresets[siteDefault].label}.`, preview: siteDefault }]
      : []),
    ...terminologyPresetIds.map((id) => ({ id, label: terminologyPresets[id].label, description: terminologyPresets[id].description, preview: id })),
  ];
  return (
    <div role="radiogroup" aria-label="Kelime seti" className="space-y-3">
      {options.map((option) => (
        <label key={option.id ?? 'site'} className="flex items-start gap-3 rounded-lg border border-[var(--line)] p-4">
          <input type="radio" name={name} className="mt-1" checked={value === option.id} onChange={() => onChange(option.id)} />
          <span>
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{option.description}</span>
            <span className="mt-1 block text-xs text-[var(--muted)]">Örnek: {example(option.preview)}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
