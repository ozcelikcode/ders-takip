import type { AdminOverview, ManagedUser } from '@study-tracker/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminDashboardPage from '../src/pages/admin/AdminDashboardPage';
import { usersAPI } from '../src/services/api';
const auth = vi.hoisted(() => ({ user: { id: '1', role: 'admin' } }));
vi.mock('../src/store/authStore', () => ({ useAuthStore: () => auth }));
vi.mock('../src/hooks/useAccountQueryKeys', () => ({
  useAccountQueryKeys: () => ({
    resource: (...parts: unknown[]) => ['account', '1', ...parts],
  }),
}));
vi.mock('../src/services/api', () => ({
  usersAPI: { getAdminOverview: vi.fn(), getUsers: vi.fn() },
}));
const overview: AdminOverview = {
  users: { total: 142, active: 130 },
  courses: { total: 21, active: 15 },
  sessions: {
    totalSessions: 50,
    completedSessions: 12,
    studySeconds: 3660,
    lastActivity: null,
  },
  recentSessions: [
    'planned',
    'in_progress',
    'paused',
    'completed',
    'cancelled',
  ].map((status, index) => ({
    id: index + 1,
    title: `Session ${index}`,
    status: status as AdminOverview['recentSessions'][number]['status'],
    sessionType: ['study', 'pomodoro', 'review', 'break', 'study'][index]!,
    duration: 60,
    userName: 'Ece Öğrenci',
  })),
};
const user: ManagedUser = {
  id: 2,
  username: 'ece',
  email: 'ece@example.com',
  firstName: 'Ece',
  lastName: 'Öğrenci',
  role: 'student',
  isActive: true,
  createdAt: '2030-01-01T09:00:00Z',
};
function response<T>(data: T) {
  return {
    data: { success: true, data },
    status: 200,
    
    
    config: { url: '' },
  };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AdminDashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  auth.user.role = 'admin';
  vi.mocked(usersAPI.getAdminOverview).mockResolvedValue(
    response({ overview }),
  );
  vi.mocked(usersAPI.getUsers).mockResolvedValue(
    response({
      users: [user],
      pagination: { current: 1, pages: 29, total: 142, limit: 5 },
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('keeps overview reads behind the administrator boundary', () => {
  auth.user.role = 'student';
  mount();
  expect(usersAPI.getAdminOverview).not.toHaveBeenCalled();
  expect(usersAPI.getUsers).not.toHaveBeenCalled();
  expect(screen.queryByText('Yönetim özeti')).toBeNull();
});
it('renders server-wide totals and measured time rather than a loaded user count or planned duration', async () => {
  mount();
  await screen.findByText('142');
  expect(screen.getByText('21')).toBeTruthy();
  expect(screen.getByText('50')).toBeTruthy();
  expect(screen.getByText('1 sa 1 dk')).toBeTruthy();
  expect(screen.getByText('130 aktif hesap')).toBeTruthy();
  expect(usersAPI.getUsers).toHaveBeenCalledWith({ limit: 5 });
  expect(
    screen
      .getByRole('link', { name: /Kullanıcı yönetimi/ })
      .getAttribute('href'),
  ).toBe('/admin/users');
});
it('names every session status and localizes session types without collapsing paused or cancelled', async () => {
  mount();
  const list = await screen.findByRole('region', {
    name: 'Son seanslar',
  });
  await within(list).findByText('Planlandı');
  for (const label of [
    'Planlandı',
    'Devam ediyor',
    'Duraklatıldı',
    'Tamamlandı',
    'İptal edildi',
  ])
    expect(within(list).getByText(label)).toBeTruthy();
  expect(within(list).getByText(/Tekrar/)).toBeTruthy();
  expect(within(list).getByText(/Mola/)).toBeTruthy();
});
it('keeps pending data separate from genuine zero and empty values', async () => {
  let resolve!: (
    value: Awaited<ReturnType<typeof usersAPI.getAdminOverview>>,
  ) => void;
  vi.mocked(usersAPI.getAdminOverview).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  mount();
  expect(screen.getByText('Yönetim özeti yükleniyor…')).toBeTruthy();
  expect(screen.queryByText('Henüz seans yok.')).toBeNull();
  expect(screen.queryByText('0')).toBeNull();
  await act(() => resolve(response({ overview })));
  await screen.findByText('142');
});
it('recovers overview errors without hiding a separately loaded user list', async () => {
  vi.mocked(usersAPI.getAdminOverview).mockRejectedValueOnce(
    new Error('Offline'),
  );
  mount();
  await screen.findByText('Yönetim özeti alınamadı.');
  expect(await screen.findByText('ece@example.com')).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
  expect(screen.queryByText('Henüz seans yok.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Özeti tekrar yükle' }));
  await screen.findByText('142');
});
it('retries user reads independently without converting failure into an empty list', async () => {
  vi.mocked(usersAPI.getUsers).mockRejectedValueOnce(new Error('Offline'));
  mount();
  await screen.findByText('Kullanıcılar alınamadı.');
  expect(await screen.findByText('142')).toBeTruthy();
  expect(screen.queryByText('Henüz kullanıcı yok.')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Kullanıcıları tekrar yükle' }),
  );
  await screen.findByText('ece@example.com');
  expect(usersAPI.getAdminOverview).toHaveBeenCalledTimes(1);
});
it('shows genuine empty collections and zero totals only after successful reads', async () => {
  vi.mocked(usersAPI.getAdminOverview).mockResolvedValue(
    response({
      overview: {
        users: { total: 0, active: 0 },
        courses: { total: 0, active: 0 },
        sessions: {
          totalSessions: 0,
          completedSessions: 0,
          studySeconds: 0,
          lastActivity: null,
        },
        recentSessions: [],
      },
    }),
  );
  vi.mocked(usersAPI.getUsers).mockResolvedValue(
    response({
      users: [],
      pagination: { current: 1, pages: 0, total: 0, limit: 5 },
    }),
  );
  mount();
  await screen.findByText('Henüz kullanıcı yok.');
  await screen.findByText('Henüz seans yok.');
  expect(screen.getByText('0 sn')).toBeTruthy();
});
it('rejects missing response data rather than inventing a healthy empty overview', async () => {
  vi.mocked(usersAPI.getAdminOverview).mockResolvedValue(
    response({ overview: undefined }) as unknown as Awaited<
      ReturnType<typeof usersAPI.getAdminOverview>
    >,
  );
  mount();
  await screen.findByText('Yönetim özeti alınamadı.');
  expect(screen.queryByText('0')).toBeNull();
});
