import { useTerms } from '../../hooks/useTerms';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useLocale } from '../../lib/locale';
import { useAuthStore } from '../../store/authStore';
import { useReadNotifications } from '../../hooks/useReadNotifications';
import { useRecentSessions } from '../../hooks/useRecentSessions';
import { measuredSessionLabel } from '../../utils/sessionHelpers';
import { useLanguage, useText } from '../../store/languageStore';

export default function NotificationsPanel() {
  const language = useLanguage();
  const sessionText = useText().session;
  const text = useText().notifications;
  const { dateFns } = useLocale();
  const t = useTerms();
  const user = useAuthStore(state => state.user);
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const { ids, markRead } = useReadNotifications(user ? String(user.id) : null);
  const query = useRecentSessions();
  const sessions = query.data ?? [];
  const unread = sessions.filter((session) => !ids.has(session.id));
  const fresh = query.isSuccess;
  const mark = (values: number[]) => {
    markRead(values);
    setAnnouncement(text.marked(values.length));
    closeRef.current?.focus();
  };
  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <PopoverButton
            className="icon-button relative"
            disabled={!user}
            aria-label={
              fresh && unread.length
                ? text.buttonUnread(unread.length)
                : text.title
            }
          >
            <Bell aria-hidden="true" className="h-5 w-5" />
            {fresh && unread.length > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-(--text)"
              />
            )}
          </PopoverButton>
          <PopoverPanel
            focus
            className="dropdown-panel w-[min(360px,calc(100vw-32px))]"
            role="region"
            aria-labelledby={headingId}
          >
            <div className="flex items-center justify-between gap-2 border-b border-(--line) p-4">
              <h2 id={headingId} className="text-sm font-medium">
                {text.title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => close()}
                className="icon-button"
                aria-label={text.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p role="status" className="sr-only">
              {announcement}
            </p>
            <p className="px-4 pt-3 text-xs text-(--muted)">
              {text.hint(t)}
            </p>
            <div
              className="max-h-80 overflow-y-auto"
              aria-busy={query.isFetching}
            >
              {query.isPending && (
                <p role="status" className="p-4 text-sm">
                  {text.loading}
                </p>
              )}
              {query.isError && (
                <div role="alert" className="space-y-3 p-4 text-sm">
                  <p>
                    {text.failed}
                    {sessions.length > 0 ? text.showingLast : ''}
                  </p>
                  <button
                    type="button"
                    disabled={query.isFetching}
                    className="btn btn-secondary"
                    onClick={() => void query.refetch()}
                  >
                    {query.isFetching ? text.reloading : text.reload}
                  </button>
                </div>
              )}
              {fresh && sessions.length === 0 && (
                <p role="status" className="p-4 text-sm text-(--muted)">
                  {text.empty}
                </p>
              )}
              {sessions.length > 0 && (
                <ul className="divide-y divide-(--line)">
                  {sessions.map((session) => {
                    const read = ids.has(session.id);
                    return (
                      <li
                        key={session.id}
                        className="flex items-start justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="wrap-break-word text-sm font-medium">
                            {session.title}
                          </p>
                          <p className="mt-1 text-xs text-(--muted)">
                            {measuredSessionLabel(session, sessionText, language)} ·{' '}
                            {formatDistanceToNow(
                              new Date(session.completedAt || session.endTime),
                              { addSuffix: true, locale: dateFns },
                            )}
                          </p>
                          <p className="mt-1 text-xs text-(--muted)">
                            {read ? text.read : text.unread}
                          </p>
                        </div>
                        {!read && (
                          <button
                            type="button"
                            className="icon-button shrink-0"
                            disabled={!fresh}
                            aria-label={text.markRead(session.title)}
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
              <div className="border-t border-(--line) p-3">
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => mark(unread.map((session) => session.id))}
                >
                  <CheckCheck aria-hidden="true" className="h-4 w-4" />
                  {text.markAllRead}
                </button>
              </div>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}
