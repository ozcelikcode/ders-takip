import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SystemStatus } from '@study-tracker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import AdminSystemPage from '../src/pages/admin/AdminSystemPage';
import { systemAPI } from '../src/services/api';

vi.mock('../src/services/api', () => ({ systemAPI: { status: vi.fn() } }));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return { useAccountQueryKeys: () => accountQueryKeys('1', 'Europe/Istanbul') };
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const status: SystemStatus = {
  generatedAt: '2026-11-03T12:00:00.000Z',
  server: { environment: 'production', nodeVersion: 'v24.21.0', platform: 'Linux 6.1 (x64)', startedAt: '2026-11-01T09:30:00.000Z', uptimeSeconds: 2 * 86_400 + 2 * 3600 + 30 * 60, memory: { rssBytes: 120 * 1024 ** 2, heapUsedBytes: 40 * 1024 ** 2, heapTotalBytes: 64 * 1024 ** 2 }, loadAverage: [0.2, 0.15, 0.1], cpuCount: 2 },
  database: { path: '/data/database.sqlite', sqliteVersion: '3.50.0', journalMode: 'wal', sizeBytes: 3 * 1024 ** 2, walBytes: 0, freeBytes: 4096, migrations: { applied: 13, required: 14, latest: '013-tags' }, tables: [{ name: 'users', rows: 12, bytes: 8192 }, { name: 'study_sessions', rows: 1530, bytes: null }] },
  activity: { users: 12, activeUsers: 11, administrators: 1, signedInLastDay: 4, newUsersLastWeek: 2, openSignIns: 6, runningSessions: 1, sessionsLastDay: 9, pushSubscriptions: 3, calendarFeeds: 2 },
  backups: { directory: '/data/backups', copyDirectory: null, count: 14, totalBytes: 40 * 1024 ** 2, latest: { createdAt: '2026-11-03T03:00:00.000Z', type: 'auto', verified: false }, intervalDays: 1 },
  configuration: { frontendUrl: 'https://plan.example.org', trustProxy: 1, language: 'tr', maintenanceMode: false, allowRegistration: true, auditLogPath: '/data/admin-audit.jsonl', auditLogBytes: 2048, email: { enabled: false, host: null, port: null }, push: { enabled: true } },
};

it('lays out the system status and points at what needs attention', async () => {
  vi.mocked(systemAPI.status).mockResolvedValue(status);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminSystemPage /></QueryClientProvider>);
  const database = await screen.findByRole('region', { name: 'Veritabanı' });
  expect(within(database).getByText('14 migration’ın 13 tanesi uygulandı').className).toContain('text-red-600');
  const tables = within(database).getByRole('table');
  expect(within(tables).getByRole('rowheader', { name: 'study_sessions' }).closest('tr')?.textContent).toContain('1.530');
  expect(within(tables).getByText('1.542')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Sunucu' })).getByText('2 g 2 sa 30 dk')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Yedekler' })).getByText(/DOĞRULANMADI/).className).toContain('text-red-600');
  expect(within(screen.getByRole('region', { name: 'Yapılandırma' })).getByText('Yapılandırılmadı')).toBeTruthy();
});
