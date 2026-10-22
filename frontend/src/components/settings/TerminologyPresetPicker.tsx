import {
  createTerms,
  customTerminologySchema,
  terminologyPresetIds,
  type CustomTerminology,
  type Language,
  type TerminologyPresetId,
} from '@study-tracker/contracts';
import { useLanguage, useText } from '../../store/languageStore';

/** A preset id, `null` for "follow the site", or `custom` for the person's own words. */
export type TerminologyChoice = TerminologyPresetId | null | 'custom';

interface TerminologyPresetPickerProps {
  name: string;
  value: TerminologyChoice;
  onChange: (choice: TerminologyChoice) => void;
  /** Offers a "follow the site" choice (value null) that resolves to this vocabulary. */
  siteDefault?: TerminologyPresetId | CustomTerminology;
  /** The words shown for the custom choice; omitted until there are any. */
  custom?: CustomTerminology | null;
}

const example = (source: TerminologyPresetId | CustomTerminology, language: Language) => {
  const terms = createTerms(source, language);
  return `${terms.course({ capitalize: true })} → ${terms.topic({ capitalize: true })} · ${terms.session({ capitalize: true })}`;
};

/** Radio cards for the vocabulary presets and custom words, each with its example words. */
export default function TerminologyPresetPicker({ name, value, onChange, siteDefault, custom }: TerminologyPresetPickerProps) {
  const text = useText().terminology;
  const language = useLanguage();
  const siteLabel = (source: TerminologyPresetId | CustomTerminology) =>
    typeof source === 'string' ? text.presets[source].label : text.customLower;
  const customPreview = custom && customTerminologySchema.safeParse(custom).success ? custom : null;
  const options: { id: TerminologyChoice; label: string; description: string; preview: TerminologyPresetId | CustomTerminology | null }[] = [
    ...(siteDefault
      ? [{ id: null, label: text.siteDefault, description: text.siteDefaultHint(siteLabel(siteDefault)), preview: siteDefault }]
      : []),
    ...terminologyPresetIds.map((id) => ({ id, label: text.presets[id].label, description: text.presets[id].description, preview: id })),
    { id: 'custom', label: text.custom, description: text.customHint, preview: customPreview },
  ];
  return (
    <div role="radiogroup" aria-label={text.groupLabel} className="space-y-3">
      {options.map((option) => (
        <label key={option.id ?? 'site'} className="flex items-start gap-3 rounded-lg border border-(--line) p-4">
          <input type="radio" name={name} className="mt-1" checked={value === option.id} onChange={() => onChange(option.id)} />
          <span>
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="mt-1 block text-sm text-(--muted)">{option.description}</span>
            {option.preview && <span className="mt-1 block text-xs text-(--muted)">{text.example(example(option.preview, language))}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
