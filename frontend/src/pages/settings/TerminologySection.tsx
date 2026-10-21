import {
  customTerminologyFrom,
  customTerminologySchema,
  type CustomTerminology,
  type PreferencesPatch,
  type TerminologyPresetId,
  type UserPreferences,
} from '@study-tracker/contracts';
import { useId, useState } from 'react';
import CustomTerminologyEditor from '../../components/settings/CustomTerminologyEditor';
import TerminologyPresetPicker, { type TerminologyChoice } from '../../components/settings/TerminologyPresetPicker';

interface TerminologySectionProps {
  preferences: UserPreferences;
  /** What the site shows people who follow it. */
  siteTerminology: TerminologyPresetId | CustomTerminology;
  onSave: (patch: PreferencesPatch) => void;
}

const sameWords = (a: CustomTerminology, b: CustomTerminology) => JSON.stringify(a) === JSON.stringify(b);

/** Personal vocabulary: follow the site, pick a preset (saved at once) or type custom words (saved on demand). */
export default function TerminologySection({ preferences, siteTerminology, onSave }: TerminologySectionProps) {
  const prefix = useId();
  const saved = preferences.customTerminology ?? null;
  const [editing, setEditing] = useState(false);
  // Unsaved custom words start from what the person sees now, so they change only what they need.
  const [start] = useState<CustomTerminology>(() => {
    const seen = saved ?? preferences.terminologyPreset ?? siteTerminology;
    return typeof seen === 'string' ? customTerminologyFrom(seen) : seen;
  });
  const [draft, setDraft] = useState(start);
  const choice: TerminologyChoice = editing || saved ? 'custom' : (preferences.terminologyPreset ?? null);
  const valid = customTerminologySchema.safeParse(draft);

  const choose = (next: TerminologyChoice) => {
    if (next === 'custom') {
      setEditing(true);
      return;
    }
    setEditing(false);
    onSave({ terminologyPreset: next, customTerminology: null });
  };

  return (
    <section className="space-y-4 border-t border-(--line) pt-6">
      <div>
        <h2 className="text-base font-medium">Kelimeler</h2>
        <p className="mt-1 text-sm text-(--muted)">
          Ana kavramların sana nasıl görüneceğini seç. Kayıtların değişmez; yalnızca görünen kelimeler değişir.
        </p>
      </div>
      <TerminologyPresetPicker
        name={`${prefix}-terminology`}
        value={choice}
        siteDefault={siteTerminology}
        custom={saved}
        onChange={choose}
      />
      {choice === 'custom' && (
        <div className="space-y-4">
          <CustomTerminologyEditor idPrefix={prefix} value={draft} onChange={setDraft} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid.success || sameWords(saved ?? start, draft)}
            onClick={() => {
              if (!valid.success) return;
              onSave({ customTerminology: valid.data });
              setEditing(false);
            }}
          >
            Kelimeleri kaydet
          </button>
        </div>
      )}
    </section>
  );
}
