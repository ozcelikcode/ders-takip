import { useTerms } from '../../hooks/useTerms';
import { Popover } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { dateFnsLocale } from '../../lib/locale';
import { CanceledError } from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useReadNotifications } from '../../hooks/useReadNotifications';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { studySessionsAPI } from '../../services/api';
import {
  getRecentSessions,
  measuredSessionLabel,
} from '../../utils/sessionHelpers';

export default function NotificationsPanel() {
  const t = useTerms();
  const { user, epoch } = useAuthStore();
  const keys = useAccountQueryKeys();
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const { ids, markRead } = useReadNotifications(user ? String(user.id) : null);
  const query = useQuery({
    queryKey: keys.sessions('recent-notifications'),
    enabled: !!user,
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        status: 'completed',
      });
      if (useAuthStore.getState().epoch !== epoch)
        throw new CanceledError('Account changed');
      const sessions = response.data.data?.sessions;
      if (!sessions) throw new Error('Missing notification sessions');
      return getRecentSessions(sessions);
    },
    refetchInterval: 60_000,
  });
  const sessions = query.data ?? [];
  const unread = sessions.filter((session) => !ids.has(session.id));
  const fresh = query.isSuccess;
  const mark = (values: number[]) => {
    markRead(values);
    setAnnouncement(`${values.length} bildirim okundu olarak işaretlendi.`);
    closeRef.current?.focus();
  };
  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button
            className="icon-button relative"
            disabled={!user}
            aria-label={
              fresh && unread.length
                ? `Bildirimler, ${unread.length} okunmamış`
                : 'Bildirimler'
            }
          >
            <Bell aria-hidden="true" className="h-5 w-5" />
            {fresh && unread.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--text)]"
              />
            )}
          </Popover.Button>
          <Popover.Panel
            focus
            className="dropdown-panel w-[min(360px,calc(100vw-32px))]"
            role="region"
            aria-labelledby={headingId}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] p-4">
              <h2 id={headingId} className="text-sm font-medium">
                Bildirimler
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => close()}
                className="icon-button"
                aria-label="Bildirimleri kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p role="status" className="sr-only">
              {announcement}
            </p>
            <p className="px-4 pt-3 text-xs text-[var(--muted)]">
              Son 5 tamamlanan {t.session()}. Okundu bilgisi bu tarayıcıda saklanır.
            </p>
            <div
              className="max-h-80 overflow-y-auto"
              aria-busy={query.isFetching}
            >
              {query.isPending && (
                <p role="status" className="p-4 text-sm">
                  Bildirimler yükleniyor…
                </p>
              )}
              {query.isError && (
                <div role="alert" className="space-y-3 p-4 text-sm">
                  <p>
                    Bildirimler alınamadı.
                    {sessions.length > 0
                      ? ' Son alınan kayıtlar gösteriliyor.'
                      : ''}
                  </p>
                  <button
                    type="button"
                    disabled={query.isFetching}
                    className="btn btn-secondary"
                    onClick={() => void query.refetch()}
                  >
                    {query.isFetching
                      ? 'Yeniden yükleniyor…'
                      : 'Bildirimleri tekrar yükle'}
                  </button>
                </div>
              )}
              {fresh && sessions.length === 0 && (
                <p role="status" className="p-4 text-sm text-[var(--muted)]">
                  Henüz bildirim yok
                </p>
              )}
              {sessions.length > 0 && (
                <ul className="divide-y divide-[var(--line)]">
                  {sessions.map((session) => {
                    const read = ids.has(session.id);
                    return (
                      <li
                        key={session.id}
                        className="flex items-start justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium">
                            {session.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {measuredSessionLabel(session)} ·{' '}
                            {formatDistanceToNow(
                              new Date(session.completedAt || session.endTime),
                              { addSuffix: true, locale: dateFnsLocale },
                            )}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {read ? 'Okundu' : 'Okunmamış'}
                          </p>
                        </div>
                        {!read && (
                          <button
                            type="button"
                            className="icon-button shrink-0"
                            disabled={!fresh}
                            aria-label={`${session.title}: okundu olarak işaretle`}
                            onClick={() => mark([session.id])}
                          >
                            <Check aria-hidden="true" className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {fresh && unread.length > 0 && (
              <div className="border-t border-[var(--line)] p-3">
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => mark(unread.map((session) => session.id))}
                >
                  <CheckCheck aria-hidden="true" className="h-4 w-4" />
                  Görünenleri okundu işaretle
                </button>
              </div>
            )}
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}
