import { useState } from 'react';
import toast from 'react-hot-toast';
import { browserTimezone } from '../../lib/locale';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';

const dismissKey = (userId: string, zone: string) => `timezone-notice:${userId}:${zone}`;
const isDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/** Offers the browser's time zone once per account and zone when it differs from the saved one. */
export default function TimezoneNotice() {
  const userId = useAuthStore((state) => state.user?.id);
  const timezone = useUserPreferencesStore((state) => state.preferences.timezone);
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences);
  const [hidden, setHidden] = useState(false);
  const detected = browserTimezone();
  if (!userId || !detected || detected === timezone || hidden) return null;
  const key = dismissKey(userId, detected);
  if (isDismissed(key)) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* Dismissal is a per-browser convenience. */
    }
    setHidden(true);
  };
  return (
    <section
      aria-label="Saat dilimi önerisi"
      className="panel mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
    >
      <p>
        Tarayıcınızın saat dilimi <strong className="font-medium">{detected}</strong>, hesabınız{' '}
        <strong className="font-medium">{timezone}</strong> kullanıyor.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            void updatePreferences({ timezone: detected })
              .then(() => toast.success('Saat dilimi güncellendi'))
              .catch(() => toast.error('Saat dilimi güncellenemedi'))
          }
        >
          {detected} kullan
        </button>
        <button type="button" className="btn btn-secondary" onClick={dismiss}>
          Böyle kalsın
        </button>
      </div>
    </section>
  );
}
