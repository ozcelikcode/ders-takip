import { weekStartDays, resolveWeekStart, type PreferencesPatch, type UserPreferences } from '@study-tracker/contracts';
import { useMemo } from 'react';
import { browserTimezone, listTimezones } from '../../lib/locale';
import { useText } from '../../store/languageStore';

interface RegionTabProps {
  preferences: UserPreferences;
  onSave: (patch: PreferencesPatch) => void;
}

const RegionTab = ({ preferences, onSave }: RegionTabProps) => {
  const { calendar: calendarText, settings: text } = useText();
  const detected = browserTimezone();
  const zones = useMemo(() => listTimezones(preferences.timezone, detected), [preferences.timezone, detected]);
  const weekStart = resolveWeekStart(preferences);
  return (
    <div className="space-y-8">
      <section className="max-w-xl space-y-3">
        <h2 className="text-base font-medium">{text.timezone}</h2>
        <p className="text-sm text-(--muted)">
          {text.timezoneHint}
        </p>
        <label htmlFor="settings-timezone" className="block text-sm font-medium">
          {text.timezone}
        </label>
        <select
          id="settings-timezone"
          className="input"
          value={preferences.timezone}
          onChange={(event) => onSave({ timezone: event.target.value })}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {detected && detected !== preferences.timezone && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-(--muted)">{text.browserTimezone(detected)}</span>
            <button type="button" className="btn btn-secondary" onClick={() => onSave({ timezone: detected })}>
              {text.useThis}
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-(--line) pt-6">
        <h2 className="text-base font-medium">{text.weekStart}</h2>
        <div role="group" aria-label={text.weekStart} className="segmented-control">
          {weekStartDays.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={weekStart === day}
              onClick={() => onSave({ weekStartsOn: day })}
              className={`segment ${weekStart === day ? 'segment-active' : ''}`}
            >
              {calendarText.weekStarts[day]}
            </button>
          ))}
        </div>
        <p className="text-xs text-(--muted)">{text.weekStartHint}</p>
      </section>
    </div>
  );
};

export default RegionTab;
