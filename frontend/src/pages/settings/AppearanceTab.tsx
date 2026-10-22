import type { CustomTerminology, PreferencesPatch, TerminologyPresetId, UserPreferences } from '@study-tracker/contracts';
import TerminologySection from './TerminologySection';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../../store/userPreferencesStore';
import { useText } from '../../store/languageStore';

const THEME_OPTIONS = [
  { value: 'light', IconComponent: Sun },
  { value: 'dark', IconComponent: Moon },
  { value: 'system', IconComponent: Monitor },
] as const;

const PREDEFINED_COLORS = [
  { name: 'blue', value: '#3B82F6' },
  { name: 'purple', value: '#8B5CF6' },
  { name: 'green', value: '#10B981' },
  { name: 'red', value: '#EF4444' },
  { name: 'orange', value: '#F59E0B' },
  { name: 'pink', value: '#EC4899' },
  { name: 'indigo', value: '#6366F1' },
  { name: 'teal', value: '#14B8A6' },
] as const;

// Calculate if a color is light or dark for contrast
const isLightColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

interface AppearanceTabProps {
  preferences: UserPreferences;
  sitePrimaryColor: string;
  siteTerminology: TerminologyPresetId | CustomTerminology;
  onThemeChange: (theme: ThemeMode) => void;
  onColorChange: (color: string | null) => void;
  onTerminologySave: (patch: PreferencesPatch) => void;
}

const AppearanceTab = ({
  preferences,
  sitePrimaryColor,
  siteTerminology,
  onThemeChange,
  onColorChange,
  onTerminologySave,
}: AppearanceTabProps) => {
  const text = useText().settings;
  const currentColor = preferences.customPrimaryColor || sitePrimaryColor;
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-medium">{text.theme}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, IconComponent }) => {
            const selected = preferences.theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onThemeChange(value)}
                aria-pressed={selected}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? 'border-(--solid) bg-(--subtle)'
                    : 'border-(--line) hover:bg-(--subtle)'
                }`}
              >
                <IconComponent className="mb-3 h-5 w-5" />
                <div className="text-sm font-medium">{text.themes[value].label}</div>
                <div className="mt-1 text-xs text-(--muted)">{text.themes[value].description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 border-t border-(--line) pt-6">
        <div>
          <h2 className="text-base font-medium">{text.primaryColor}</h2>
          <p className="mt-1 text-sm text-(--muted)">{text.primaryColorHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_COLORS.map((color) => {
            const selected = preferences.customPrimaryColor === color.value;
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => onColorChange(color.value)}
                aria-pressed={selected}
                title={text.colors[color.name]}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  selected
                    ? 'border-(--solid) bg-(--subtle) font-medium'
                    : 'border-(--line) text-(--muted) hover:bg-(--subtle) hover:text-(--text)'
                }`}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.value }}
                >
                  {selected && (
                    <Check
                      className={`h-3 w-3 ${isLightColor(color.value) ? 'text-gray-900' : 'text-white'}`}
                      strokeWidth={3}
                    />
                  )}
                </span>
                {text.colors[color.name]}
              </button>
            );
          })}
        </div>

        <div className="max-w-md space-y-2">
          <label htmlFor="settings-customPrimaryColor" className="block text-sm font-medium">
            {text.customColor}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="settings-customPrimaryColor"
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-(--line) bg-transparent p-1"
            />
            <input
              type="text"
              aria-label={text.customColorHex}
              value={currentColor}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(value) || value === '') {
                  onColorChange(value);
                }
              }}
              className="input font-mono"
              placeholder="#3B82F6"
              pattern="^#[0-9A-F]{6}$"
              maxLength={7}
            />
            {preferences.customPrimaryColor && preferences.customPrimaryColor !== sitePrimaryColor && (
              <button type="button" onClick={() => onColorChange(null)} className="btn btn-secondary whitespace-nowrap">
                {text.resetColor}
              </button>
            )}
          </div>
        </div>
      </section>

      <TerminologySection preferences={preferences} siteTerminology={siteTerminology} onSave={onTerminologySave} />
    </div>
  );
};

export default AppearanceTab;
