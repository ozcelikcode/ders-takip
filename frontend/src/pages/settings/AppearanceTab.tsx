import type { TerminologyPresetId, UserPreferences } from '@study-tracker/contracts';
import { useId } from 'react';
import TerminologyPresetPicker from '../../components/settings/TerminologyPresetPicker';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from '../../store/userPreferencesStore';

const THEME_OPTIONS = [
  { value: 'light', label: 'Açık Tema', IconComponent: Sun, description: 'Aydınlık görünüm' },
  { value: 'dark', label: 'Koyu Tema', IconComponent: Moon, description: 'Karanlık görünüm' },
  { value: 'system', label: 'Sistem', IconComponent: Monitor, description: 'Sistem ayarlarını kullan' },
];

const PREDEFINED_COLORS = [
  { name: 'Mavi', value: '#3B82F6' },
  { name: 'Mor', value: '#8B5CF6' },
  { name: 'Yeşil', value: '#10B981' },
  { name: 'Kırmızı', value: '#EF4444' },
  { name: 'Turuncu', value: '#F59E0B' },
  { name: 'Pembe', value: '#EC4899' },
  { name: 'İndigo', value: '#6366F1' },
  { name: 'Turkuaz', value: '#14B8A6' },
];

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
  siteTerminologyPreset: TerminologyPresetId;
  onThemeChange: (theme: ThemeMode) => void;
  onColorChange: (color: string | null) => void;
  onTerminologyChange: (preset: TerminologyPresetId | null) => void;
}

const AppearanceTab = ({
  preferences,
  sitePrimaryColor,
  siteTerminologyPreset,
  onThemeChange,
  onColorChange,
  onTerminologyChange,
}: AppearanceTabProps) => {
  const prefix = useId();
  const currentColor = preferences.customPrimaryColor || sitePrimaryColor;
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-medium">Tema</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, label, IconComponent, description }) => {
            const selected = preferences.theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onThemeChange(value as ThemeMode)}
                aria-pressed={selected}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? 'border-(--solid) bg-(--subtle)'
                    : 'border-(--line) hover:bg-(--subtle)'
                }`}
              >
                <IconComponent className="mb-3 h-5 w-5" />
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-xs text-(--muted)">{description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 border-t border-(--line) pt-6">
        <div>
          <h2 className="text-base font-medium">Ana renk</h2>
          <p className="mt-1 text-sm text-(--muted)">Vurgu ve odak rengini özelleştirin</p>
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
                title={color.name}
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
                {color.name}
              </button>
            );
          })}
        </div>

        <div className="max-w-md space-y-2">
          <label htmlFor="settings-customPrimaryColor" className="block text-sm font-medium">
            Özel renk
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
              aria-label="Özel renk HEX kodu"
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
                Varsayılana dön
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-(--line) pt-6">
        <div>
          <h2 className="text-base font-medium">Kelimeler</h2>
          <p className="mt-1 text-sm text-(--muted)">
            Ana kavramların sana nasıl görüneceğini seç. Kayıtların değişmez; yalnızca görünen kelimeler değişir.
          </p>
        </div>
        <TerminologyPresetPicker
          name={`${prefix}-terminologyPreset`}
          value={preferences.terminologyPreset ?? null}
          siteDefault={siteTerminologyPreset}
          onChange={onTerminologyChange}
        />
      </section>
    </div>
  );
};

export default AppearanceTab;
