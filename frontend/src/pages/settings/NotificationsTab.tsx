import type { UserPreferences } from '@study-tracker/contracts';

const OPTIONS = [
  { key: 'emailNotifications', label: 'E-posta Bildirimleri', description: 'Önemli güncellemeler için e-posta al' },
  { key: 'pushNotifications', label: 'Push Bildirimleri', description: 'Tarayıcı bildirimlerini etkinleştir' },
  { key: 'taskReminders', label: 'Hatırlatmalar', description: 'Yaklaşan planlar için hatırlatma al' },
] as const;

interface NotificationsTabProps {
  preferences: UserPreferences;
  onChange: (key: string, value: boolean) => void;
}

const NotificationsTab = ({ preferences, onChange }: NotificationsTabProps) => (
  <section className="space-y-4">
    <h2 className="text-base font-medium">Bildirim tercihleri</h2>
    <div className="space-y-3">
      {OPTIONS.map(({ key, label, description }) => (
        <label key={key} className="flex items-start gap-3 rounded-lg border border-[var(--line)] p-4">
          <input
            type="checkbox"
            aria-label={label}
            className="mt-1"
            checked={preferences[key]}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{description}</span>
          </span>
        </label>
      ))}
    </div>
  </section>
);

export default NotificationsTab;
