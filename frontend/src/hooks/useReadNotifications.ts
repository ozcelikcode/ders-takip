import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { notificationsAPI } from '../services/api';
import { useAccountQueryKeys } from './useAccountQueryKeys';

// Earlier versions kept read notices per browser under this key; they are handed to the server once, then removed.
const legacyKey = (id: string) => `read-notifications:${id}`;
const legacyIds = (id: string): number[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(legacyKey(id)) || '[]');
    return Array.isArray(stored) ? stored.filter((value): value is number => Number.isSafeInteger(value) && value > 0).slice(-500) : [];
  } catch { return []; }
};

/**
 * Read state of the finished-session notices, kept on the server so every device agrees. `isRead` also covers what
 * was marked a moment ago, before the refreshed list arrives.
 */
export const useReadNotifications = (id: string | null) => {
  const client = useQueryClient();
  const keys = useAccountQueryKeys();
  const [marked, setMarked] = useState<{ owner: string | null; ids: Set<number> }>({ owner: id, ids: new Set() });
  const refresh = () => client.invalidateQueries({ queryKey: keys.sessions('recent-completed') });

  useEffect(() => {
    if (!id) return;
    const ids = legacyIds(id);
    if (!ids.length) return;
    void notificationsAPI.markRead(ids).then(() => {
      try { localStorage.removeItem(legacyKey(id)); } catch { /* Storage is optional. */ }
      void client.invalidateQueries({ queryKey: keys.sessions('recent-completed') });
    }).catch(() => undefined);
  }, [id, client, keys]);

  const recent = marked.owner === id ? marked.ids : new Set<number>();
  const isRead = (session: { id: number; notificationReadAt?: string | null }) => !!session.notificationReadAt || recent.has(session.id);
  const markRead = async (values: number[]) => {
    if (!id || !values.length) return;
    setMarked({ owner: id, ids: new Set([...recent, ...values]) });
    try {
      await notificationsAPI.markRead(values);
    } catch (error) {
      // The server did not store it, so the notices show as unread again.
      setMarked((current) => ({ owner: current.owner, ids: new Set([...current.ids].filter((value) => !values.includes(value))) }));
      throw error;
    }
    await refresh();
  };
  return { isRead, markRead };
};
