import { useQuery } from '@tanstack/react-query';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { backupAPI } from '../../services/api';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { BackupRecord, ResetMode } from '../../types/backup';
import { useText } from '../../store/languageStore';
import { useLocale } from '../../lib/locale';

export type MaintenanceAction =
  | { kind: 'restore'; backup: BackupRecord }
  | { kind: 'reset'; mode: ResetMode };
export default function BackupPanel({
  busy,
  dirty,
  onCreate,
  onAction,
}: {
  busy: boolean;
  dirty: boolean;
  onCreate: () => void;
  onAction: (action: MaintenanceAction) => void;
}) {
  const text = useText().siteSettings;
  const { tag } = useLocale();
  const keys = useAccountQueryKeys();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const query = useQuery({
    queryKey: keys.resource('backups'),
    queryFn: async () => {
      const response = await backupAPI.getBackups();
      if (!Array.isArray(response.data.data))
        throw new Error('Backup list response is missing');
      return response.data.data;
    },
  });
  const date = (value: string) =>
    new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  return (
    <section className="space-y-6" aria-label={text.backupSection}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">{text.backups}</h2>
          <p className="mt-1 text-sm text-(--muted)">
            {text.backupsHint}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onCreate}
        >
          {text.backupNow}
        </button>
      </div>
      {query.isPending ? (
        <p role="status">{text.backupsLoading}</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p>{text.backupsFailed}</p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || query.isFetching}
            onClick={() => void query.refetch()}
          >
            {text.backupsRetry}
          </button>
        </div>
      ) : query.data.length === 0 ? (
        <p className="text-sm text-(--muted)">{text.noBackups}</p>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border border-(--line)"
          aria-busy={query.isFetching}
        >
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {text.backupsCaption}
            </caption>
            <thead className="border-b bg-(--subtle) text-xs text-(--muted)">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  {text.columns.date}
                </th>
                <th scope="col" className="p-3 font-medium">
                  {text.columns.type}
                </th>
                <th scope="col" className="p-3 font-medium">
                  {text.columns.size}
                </th>
                <th scope="col" className="p-3 font-medium">
                  {text.columns.status}
                </th>
                <th scope="col" className="p-3 font-medium">
                  {text.columns.action}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--line)">
              {query.data.map((backup) => (
                <tr key={backup.id}>
                  <td className="whitespace-nowrap p-3">
                    {date(backup.createdAt)}
                  </td>
                  <td className="p-3">
                    {backup.type === 'auto' ? text.backupTypes.auto : text.backupTypes.manual}
                  </td>
                  <td className="whitespace-nowrap p-3 tabular-nums">
                    {text.megabytes((backup.size / 1024 / 1024).toFixed(2))}
                  </td>
                  <td className="p-3">
                    {backup.verified === true ? text.verified : text.unverified}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="btn btn-secondary whitespace-nowrap"
                      aria-label={text.restoreBackup(date(backup.createdAt))}
                      disabled={
                        backup.verified !== true ||
                        busy ||
                        dirty ||
                        query.isFetching
                      }
                      onClick={() => onAction({ kind: 'restore', backup })}
                    >
                      {text.restore}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-(--muted)">
        {text.backupPolicy}
      </p>
      <div className="space-y-3 border-t border-(--line) pt-6">
        <h2 className="text-base font-medium">{text.resetTitle}</h2>
        <p className="text-sm text-(--muted)">
          {text.resetHint}
        </p>
        {dirty && (
          <p role="status" className="text-sm">
            {text.saveFirst}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || dirty}
            onClick={() => onAction({ kind: 'reset', mode: 'settings_only' })}
          >
            {text.resetSettingsOnly}
          </button>
          <button
            type="button"
            className="btn btn-secondary text-red-600"
            disabled={busy || dirty}
            onClick={() => onAction({ kind: 'reset', mode: 'all' })}
          >
            {text.resetAllTitle}
          </button>
        </div>
      </div>
    </section>
  );
}
