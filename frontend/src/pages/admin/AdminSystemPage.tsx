import { useQuery } from '@tanstack/react-query';
import type { SystemStatus } from '@study-tracker/contracts';
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import LoadError from '../../components/common/LoadError';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useLocale } from '../../lib/locale';
import { systemAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';

// Live enough to watch, light enough for a small server.
const refreshEvery = 30_000;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel" aria-label={title}>
      <h2 className="panel-heading text-sm font-medium">{title}</h2>
      <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

function Item({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <dt className="text-xs text-(--muted)">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** A read-only view of the running site for administrators: server, database, activity, backups and configuration. */
export default function AdminSystemPage() {
  const text = useText().system;
  const { tag } = useLocale();
  const timeZone = useUserPreferencesStore((state) => state.preferences.timezone);
  const keys = useAccountQueryKeys();
  const query = useQuery({ queryKey: keys.resource('admin-system'), queryFn: systemAPI.status, refetchInterval: refreshEvery });

  const number = (value: number) => new Intl.NumberFormat(tag).format(value);
  const bytes = (value: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const power = value > 0 ? Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024))) : 0;
    return `${new Intl.NumberFormat(tag, { maximumFractionDigits: power ? 1 : 0 }).format(value / 1024 ** power)} ${units[power]}`;
  };
  const moment = (value: string) => new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value));
  const duration = (seconds: number) => {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return text.uptime(days, hours, minutes);
  };
  const onOff = (value: boolean) => (value ? text.on : text.off);

  const render = (status: SystemStatus) => {
    const { server, database, activity, backups, configuration } = status;
    const rows = database.tables.reduce((sum, table) => sum + table.rows, 0);
    return (
      <div className="space-y-5">
        <Section title={text.server}>
          <Item label={text.environment} value={server.environment} />
          <Item label={text.uptimeLabel} value={duration(server.uptimeSeconds)} />
          <Item label={text.startedAt} value={moment(server.startedAt)} />
          <Item label={text.node} value={server.nodeVersion} />
          <Item label={text.platform} value={server.platform} />
          <Item label={text.load(server.cpuCount)} value={server.loadAverage.join(' · ')} />
          <Item label={text.memory} value={bytes(server.memory.rssBytes)} />
          <Item label={text.heap} value={`${bytes(server.memory.heapUsedBytes)} / ${bytes(server.memory.heapTotalBytes)}`} />
        </Section>

        <section className="panel" aria-label={text.database}>
          <h2 className="panel-heading text-sm font-medium">{text.database}</h2>
          <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Item label={text.databaseSize} value={bytes(database.sizeBytes)} />
            <Item label={text.walSize} value={bytes(database.walBytes)} />
            <Item label={text.freeSpace} value={bytes(database.freeBytes)} />
            <Item label={text.sqlite} value={`${database.sqliteVersion} · ${database.journalMode}`} />
            <Item
              label={text.migrations}
              value={
                <span className={database.migrations.applied < database.migrations.required ? 'text-red-600 dark:text-red-400' : ''}>
                  {text.migrationCount(database.migrations.applied, database.migrations.required)}
                </span>
              }
            />
            <Item label={text.latestMigration} value={database.migrations.latest ?? '—'} />
            <Item label={text.databasePath} value={<code className="text-xs">{database.path}</code>} wide />
          </dl>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm">
              <caption className="sr-only">{text.tables}</caption>
              <thead className="text-left text-xs text-(--muted)">
                <tr>
                  <th scope="col" className="px-5 py-2 font-normal">{text.table}</th>
                  <th scope="col" className="px-5 py-2 text-right font-normal">{text.rows}</th>
                  <th scope="col" className="px-5 py-2 text-right font-normal">{text.size}</th>
                </tr>
              </thead>
              <tbody>
                {database.tables.map((table) => (
                  <tr key={table.name} className="border-t">
                    <th scope="row" className="px-5 py-2 text-left font-mono text-xs font-normal">{table.name}</th>
                    <td className="px-5 py-2 text-right tabular-nums">{number(table.rows)}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-(--muted)">{table.bytes === null ? '—' : bytes(table.bytes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <th scope="row" className="px-5 py-2 text-left text-xs">{text.total(database.tables.length)}</th>
                  <td className="px-5 py-2 text-right tabular-nums">{number(rows)}</td>
                  <td className="px-5 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <Section title={text.activity}>
          <Item label={text.users} value={text.usersValue(activity.users, activity.activeUsers)} />
          <Item label={text.administrators} value={number(activity.administrators)} />
          <Item label={text.newUsers} value={number(activity.newUsersLastWeek)} />
          <Item label={text.signedInLastDay} value={number(activity.signedInLastDay)} />
          <Item label={text.openSignIns} value={number(activity.openSignIns)} />
          <Item label={text.runningSessions} value={number(activity.runningSessions)} />
          <Item label={text.sessionsLastDay} value={number(activity.sessionsLastDay)} />
          <Item label={text.pushSubscriptions} value={number(activity.pushSubscriptions)} />
          <Item label={text.calendarFeeds} value={number(activity.calendarFeeds)} />
        </Section>

        <Section title={text.backups}>
          <Item label={text.backupCount} value={`${number(backups.count)} · ${bytes(backups.totalBytes)}`} />
          <Item
            label={text.latestBackup}
            value={
              backups.latest ? (
                <span className={backups.latest.verified ? '' : 'text-red-600 dark:text-red-400'}>
                  {text.latestBackupValue(moment(backups.latest.createdAt), backups.latest.type === 'auto', backups.latest.verified)}
                </span>
              ) : (
                text.noBackup
              )
            }
          />
          <Item label={text.backupInterval} value={text.everyDays(backups.intervalDays)} />
          <Item label={text.backupDirectory} value={<code className="text-xs">{backups.directory}</code>} wide />
          <Item label={text.backupCopy} value={backups.copyDirectory ? <code className="text-xs">{backups.copyDirectory}</code> : text.notSet} wide />
        </Section>

        <Section title={text.configuration}>
          <Item label={text.frontendUrl} value={configuration.frontendUrl} />
          <Item label={text.language} value={configuration.language.toUpperCase()} />
          <Item label={text.trustProxy} value={configuration.trustProxy} />
          <Item label={text.maintenance} value={onOff(configuration.maintenanceMode)} />
          <Item label={text.registration} value={onOff(configuration.allowRegistration)} />
          <Item
            label={text.email}
            value={configuration.email.enabled ? `${configuration.email.host}:${configuration.email.port}` : text.notConfigured}
          />
          <Item label={text.push} value={configuration.push.enabled ? text.on : text.notConfigured} />
          <Item label={text.auditLog} value={<><code className="text-xs">{configuration.auditLogPath}</code> · {bytes(configuration.auditLogBytes)}</>} wide />
        </Section>
        <p className="text-xs text-(--muted)">{text.privacy}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title}
        description={query.data ? text.updated(moment(query.data.generatedAt)) : text.description}
        actions={
          <button type="button" className="btn btn-secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            {text.refresh}
          </button>
        }
      />
      {query.isPending ? (
        <p role="status" className="py-8 text-center text-sm text-(--muted)">{text.loading}</p>
      ) : query.data ? (
        render(query.data)
      ) : (
        <LoadError message={text.failed} query={query} className="panel p-6 text-sm" />
      )}
    </div>
  );
}
