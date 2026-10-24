import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminAuditEntry, AdminAuditPage } from '@study-tracker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import AuditLogPanel from '../src/components/admin/AuditLogPanel';
import { adminAuditAPI } from '../src/services/api';

vi.mock('../src/services/api', () => ({ adminAuditAPI: { list: vi.fn() } }));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return { useAccountQueryKeys: () => accountQueryKeys('1', 'Europe/Istanbul') };
});

const chief = { id: 1, username: 'chief' };
const entry = (seq: number, patch: Partial<AdminAuditEntry>): AdminAuditEntry => ({
  seq, at: '2026-10-24T10:00:00.000Z', action: 'signedIn', actor: chief, target: null, details: {}, ip: '127.0.0.1', ...patch,
});
const page = (entries: AdminAuditEntry[], hasMore: boolean, intact = true): AdminAuditPage => ({
  entries, hasMore, integrity: { intact, brokenAt: intact ? null : 3, total: 5 },
});
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuditLogPanel /></QueryClientProvider>);

afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('reads the log newest first in plain words and loads older entries on request', async () => {
  vi.mocked(adminAuditAPI.list)
    .mockResolvedValueOnce(page([
      entry(5, { action: 'settingsChanged', details: { keys: ['siteName', 'sessionTimeout'] } }),
      entry(4, { action: 'userRoleChanged', target: { id: 2, username: 'ece' }, details: { role: 'admin' } }),
      entry(3, { action: 'confirmationFailed', details: { operation: 'userDelete' } }),
      entry(2, { action: 'signInFailed', actor: null, target: chief, ip: null }),
    ], true))
    .mockResolvedValueOnce(page([entry(1, {})], false));
  mount();
  expect(await screen.findByText('Günlük bütün: 5 kayıt, hiçbiri sonradan değiştirilmemiş.')).toBeTruthy();
  expect(screen.getByText('Değişen: Site adı, Oturum süresi')).toBeTruthy();
  expect(screen.getByText('chief → ece')).toBeTruthy();
  expect(screen.getByText('Yönetici')).toBeTruthy();
  expect(screen.getByText('Denenen: hesap silme')).toBeTruthy();
  expect(screen.getByText('Yönetici hesabına hatalı şifre')).toBeTruthy();
  expect(screen.queryByText('Yönetici girişi')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Daha eski kayıtlar' }));
  expect(await screen.findByText('Yönetici girişi')).toBeTruthy();
  expect(adminAuditAPI.list).toHaveBeenLastCalledWith(2);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Daha eski kayıtlar' })).toBeNull());
});

it('warns when the chain of entries is broken', async () => {
  vi.mocked(adminAuditAPI.list).mockResolvedValue(page([entry(1, {})], false, false));
  mount();
  expect((await screen.findByRole('alert')).textContent).toBe('Günlük 3. kayıttan itibaren değiştirilmiş ya da silinmiş; o noktadan sonrası güvenilir değil.');
});
