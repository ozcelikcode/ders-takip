import { useInfiniteQuery } from '@tanstack/react-query';
import type { AdminAuditEntry, ConfirmedOperation, ResetMode } from '@study-tracker/contracts';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useLocale } from '../../lib/locale';
import { adminAuditAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

/** The details worth showing for an entry, in the interface language. */
function useDetails() {
  const { adminAudit: text, roles, siteSettings } = useText();
  return (entry: AdminAuditEntry): string[] => {
    const { details } = entry;
    const lines: string[] = [];
    if (typeof details.role === 'string') lines.push(roles[details.role as keyof typeof roles]);
    if (typeof details.mode === 'string') lines.push(text.resetModes[details.mode as ResetMode]);
    if (typeof details.backupId === 'number') lines.push(text.backup(details.backupId));
    if (typeof details.operation === 'string') lines.push(text.attempted(text.operations[details.operation as ConfirmedOperation]));
    if (Array.isArray(details.keys)) lines.push(text.changedSettings(details.keys.map((key) => siteSettings.fieldNames[key] ?? key).join(', ')));
    return lines;
  };
}

/** The administrator log, newest first, with whether its chain of entries is still whole. */
export default function AuditLogPanel() {
  const text = useText().adminAudit;
  const { tag } = useLocale();
  const keys = useAccountQueryKeys();
  const details = useDetails();
  const log = useInfiniteQuery({
    queryKey: keys.resource('admin-audit'),
    queryFn: ({ pageParam }) => adminAuditAPI.list(pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.entries[page.entries.length - 1]?.seq : undefined),
  });
  const time = new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short' });

  if (log.isPending) return <p role="status" className="text-sm">{text.loading}</p>;
  if (log.isError) return <p role="alert" className="text-sm text-red-600">{text.failed}</p>;
  const { integrity } = log.data.pages[0]!;
  const entries = log.data.pages.flatMap((page) => page.entries);
  return (
    <section className="space-y-4" aria-labelledby="admin-audit-title">
      <div className="space-y-2">
        <h2 id="admin-audit-title" className="text-base font-medium">{text.title}</h2>
        <p className="text-sm text-(--muted)">{text.hint}</p>
        <p role={integrity.intact ? 'status' : 'alert'} className={`text-sm ${integrity.intact ? '' : 'font-medium text-red-600'}`}>
          {integrity.intact ? text.intact(integrity.total) : text.broken(integrity.brokenAt ?? 1)}
        </p>
      </div>
      {!entries.length ? (
        <p className="text-sm text-(--muted)">{text.empty}</p>
      ) : (
        <ol className="divide-y divide-(--line) rounded-lg border border-(--line)">
          {entries.map((entry) => {
            const who = entry.actor?.username ?? text.nobody;
            return (
              <li key={entry.seq} className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{text.actions[entry.action]}</span>
                  <time dateTime={entry.at} className="text-xs text-(--muted)">{time.format(new Date(entry.at))}</time>
                </div>
                <p className="text-(--muted)">
                  {entry.actor || !entry.target ? who : null}
                  {entry.target && <>{entry.actor ? ' → ' : ''}{entry.target.username}</>}
                </p>
                {details(entry).map((line) => <p key={line} className="text-xs text-(--muted)">{line}</p>)}
                {entry.ip && <p className="text-xs text-(--muted)">{text.from(entry.ip)}</p>}
              </li>
            );
          })}
        </ol>
      )}
      {log.hasNextPage && (
        <button type="button" className="btn btn-secondary" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
          {log.isFetchingNextPage ? text.loadingOlder : text.older}
        </button>
      )}
    </section>
  );
}
