import { useEffect, useState } from 'react';
import { useUserPreferencesStore } from '../store/userPreferencesStore';
export const dateKeyAt = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
export const useCurrentDateKey = () => {
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return dateKeyAt(now, timezone);
};
