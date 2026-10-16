import { useEffect, useState } from 'react';
import { useUserPreferencesStore } from '../store/userPreferencesStore';
export { dateKeyInZone as dateKeyAt } from '@study-tracker/contracts';
import { dateKeyInZone } from '@study-tracker/contracts';
export const useCurrentDateKey = () => {
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return dateKeyInZone(now, timezone);
};
