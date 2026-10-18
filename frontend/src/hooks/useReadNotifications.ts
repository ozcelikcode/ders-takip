import { useEffect, useState } from 'react';
const storageKey = (id: string) => `read-notifications:${id}`;
const readNotificationIds = (id: string): number[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(id)) || '[]');
    return Array.isArray(stored) ? stored.filter((value): value is number => Number.isSafeInteger(value) && value > 0).slice(-500) : [];
  } catch { return []; }
};
export const useReadNotifications = (id: string | null) => {
  const [state, setState] = useState<{ owner: string | null; ids: Set<number> }>({ owner: id, ids: new Set(id ? readNotificationIds(id) : []) });
  useEffect(() => {
    const refresh = () => setState({ owner: id, ids: new Set(id ? readNotificationIds(id) : []) });
    const changed = (event: StorageEvent) => { if (id && event.key === storageKey(id)) refresh(); };
    refresh(); window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [id]);
  const ids = state.owner === id ? state.ids : new Set<number>();
  const markRead = (values: number[]) => {
    if (!id) return;
    const combined = [...new Set([...readNotificationIds(id), ...values])].slice(-500);
    try { localStorage.setItem(storageKey(id), JSON.stringify(combined)); } catch { /* Storage is optional. */ }
    setState({ owner: id, ids: new Set(combined) });
  };
  return { ids, markRead };
};
