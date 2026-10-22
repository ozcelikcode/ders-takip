import type { ManagedUser } from '@study-tracker/contracts';
import { HttpError } from '../src/services/httpError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { usersAPI } from '../src/services/api';
import { accountQueryKeys } from '../src/lib/queryKeys';
import AdminUsersPage from '../src/pages/admin/AdminUsersPage';

const auth = vi.hoisted(() => ({ epoch: 1, user: { id: '1', role: 'admin' } }));
vi.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(() => auth, { getState: () => auth }),
}));
vi.mock('../src/store/userPreferencesStore', () => ({
  useUserPreferencesStore: (
    selector: (value: { preferences: { timezone: string } }) => unknown,
  ) => selector({ preferences: { timezone: 'Europe/Istanbul' } }),
}));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return {
    useAccountQueryKeys: () =>
      accountQueryKeys(auth.user.id, 'Europe/Istanbul'),
  };
});
vi.mock('../src/services/api', () => ({
  usersAPI: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const student: ManagedUser = {
  id: 2,
  username: 'ece',
  email: 'ece@example.com',
  firstName: 'Ece',
  lastName: 'Öğrenci',
  role: 'student',
  isActive: true,
  createdAt: '2026-10-16T09:00:00Z',
  stats: {
    totalSessions: 4,
    completedSessions: 2,
    studySeconds: 3600,
    lastActivity: null,
  },
};
const admin: ManagedUser = {
  ...student,
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};
function response(users = [admin, student], page = 1, total = 42) {
  return {
    data: {
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / 20),
          total,
          limit: 20,
        },
      },
    },
    status: 200,
    
    
    config: { url: '' },
  };
}
function rejected() {
  return new HttpError('Denied', {
    status: 409,
    data: {
      success: false,
      error: { code: 'requestFailed' },
    },
  });
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <AdminUsersPage />
    </QueryClientProvider>,
  );
  return { client, ...view };
}
async function menu(name = 'Ece Öğrenci') {
  fireEvent.click(
    await screen.findByRole('button', { name: `${name} için işlemler` }),
  );
  return screen.findByRole('menu');
}
async function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: 'Kullanıcı oluştur' }));
  return screen.findByRole('dialog', { name: 'Kullanıcı oluştur' });
}
function fillUser() {
  for (const [label, value] of [
    ['Ad', ' Deniz '],
    ['Soyad', ' Test '],
    ['Kullanıcı adı', 'newuser'],
    ['E-posta', 'new@example.com'],
    ['Parola', 'fixture-password'],
    ['Parola tekrarı', 'fixture-password'],
  ])
    fireEvent.change(screen.getByLabelText(label!, { exact: true }), {
      target: { value },
    });
}
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
beforeEach(() => {
  auth.epoch = 1;
  auth.user = { id: '1', role: 'admin' };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(usersAPI.getUsers).mockImplementation(async (params) =>
    response([admin, student], params?.page ?? 1),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('prevents management rendering and reads for students', () => {
  auth.user.role = 'student';
  mount();
  expect(usersAPI.getUsers).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: 'Kullanıcı oluştur' }),
  ).toBeNull();
});
it('uses server totals and requests subsequent pages instead of presenting a capped local list', async () => {
  mount();
  await screen.findByText(/42 kullanıcı · Hesapları/);
  expect(usersAPI.getUsers).toHaveBeenCalledWith({
    search: '',
    page: 1,
    limit: 20,
    includeStats: true,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
  await waitFor(() =>
    expect(usersAPI.getUsers).toHaveBeenLastCalledWith({
      search: '',
      page: 2,
      limit: 20,
      includeStats: true,
    }),
  );
  await screen.findByText('Sayfa 2 / 3 · 42 kullanıcı');
});
it('submits a server-wide search, resets the page and supports clearing the query', async () => {
  vi.mocked(usersAPI.getUsers).mockImplementation(async (params) =>
    response([student], params?.page ?? 1, params?.search ? 1 : 142),
  );
  mount();
  await screen.findByRole('button', { name: 'Ece Öğrenci için işlemler' });
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
  await screen.findByText('Sayfa 2 / 8 · 142 kullanıcı');
  fireEvent.change(screen.getByLabelText('Kullanıcı ara'), {
    target: { value: ' RemoteNeedle ' },
  });
  fireEvent.submit(screen.getByRole('search', { name: 'Kullanıcılarda ara' }));
  await waitFor(() =>
    expect(usersAPI.getUsers).toHaveBeenLastCalledWith({
      search: 'RemoteNeedle',
      page: 1,
      limit: 20,
      includeStats: true,
    }),
  );
  await screen.findByText(/1 sonuç · Hesapları/);
  fireEvent.click(screen.getByRole('button', { name: 'Aramayı temizle' }));
  await waitFor(() =>
    expect(usersAPI.getUsers).toHaveBeenLastCalledWith({
      search: '',
      page: 1,
      limit: 20,
      includeStats: true,
    }),
  );
});
it('separates read errors from empty lists and recovers through a read retry', async () => {
  vi.mocked(usersAPI.getUsers).mockRejectedValueOnce(new Error('Offline'));
  mount();
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Kullanıcılar yüklenemedi.',
  );
  expect(screen.queryByText('Henüz kullanıcı bulunmuyor.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByRole('button', { name: 'Ece Öğrenci için işlemler' });
});
it('disables self role, status and deletion actions and explains the restriction', async () => {
  mount();
  const actions = await menu('Admin User');
  expect(
    within(actions).getByText(
      'Kendi yönetici erişiminizi buradan değiştiremezsiniz.',
    ),
  ).toBeTruthy();
  for (const name of ['Pasifleştir', 'Kullanıcı yap', 'Kullanıcıyı sil'])
    expect(
      (within(actions).getByRole('menuitem', { name }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  expect(usersAPI.updateUser).not.toHaveBeenCalled();
  expect(usersAPI.deleteUser).not.toHaveBeenCalled();
});
it('waits for role acknowledgement, blocks duplicates and keeps a rejected confirmation open for retry', async () => {
  let finish!: (value: Awaited<ReturnType<typeof usersAPI.updateUser>>) => void;
  vi.mocked(usersAPI.updateUser)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(response());
  const { client } = mount();
  const actions = await menu();
  fireEvent.click(
    within(actions).getByRole('menuitem', { name: 'Yönetici yap' }),
  );
  expect(
    screen.getByText(/Yönetim paneline ve sistem ayarlarına erişebilecek/),
  ).toBeTruthy();
  const confirm = screen.getByRole('button', { name: 'Uygula' });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  expect(usersAPI.updateUser).toHaveBeenCalledTimes(1);
  expect(usersAPI.updateUser).toHaveBeenCalledWith('2', { role: 'admin' });
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(async () => finish(response()));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  client.setQueryData(accountQueryKeys('2', '').resource('admin-overview'), [
    'foreign',
  ]);
  vi.mocked(usersAPI.deleteUser)
    .mockRejectedValueOnce(rejected())
    .mockResolvedValueOnce(response());
  fireEvent.click(
    within(await menu()).getByRole('menuitem', { name: 'Kullanıcıyı sil' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kullanıcıyı sil' }));
  await screen.findByText('İstek tamamlanamadı. Lütfen tekrar deneyin.');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(usersAPI.deleteUser).toHaveBeenCalledTimes(1);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Kullanıcıyı sil' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: accountQueryKeys('1', '').resource(),
  });
  expect(
    client.getQueryState(accountQueryKeys('2', '').resource('admin-overview'))
      ?.isInvalidated,
  ).toBe(false);
});
it('confirms account deactivation and preserves the account instead of using a delete request', async () => {
  vi.mocked(usersAPI.updateUser).mockResolvedValue(response());
  mount();
  fireEvent.click(
    within(await menu()).getByRole('menuitem', { name: 'Pasifleştir' }),
  );
  expect(screen.getByText(/Verileri korunur/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Uygula' }));
  await waitFor(() =>
    expect(usersAPI.updateUser).toHaveBeenCalledWith('2', { isActive: false }),
  );
  expect(usersAPI.deleteUser).not.toHaveBeenCalled();
});
it('returns to a valid page after deleting its final row', async () => {
  let deleted = false;
  vi.mocked(usersAPI.getUsers).mockImplementation(async (params) =>
    response(
      params?.page === 3 && deleted ? [] : [student],
      params?.page ?? 1,
      deleted ? 40 : 41,
    ),
  );
  vi.mocked(usersAPI.deleteUser).mockImplementation(async () => {
    deleted = true;
    return response();
  });
  mount();
  // The open menu owns Escape; the rest of the page stays inert until it closes.
  fireEvent.keyDown(await menu(), { key: 'Escape', code: 'Escape' });
  fireEvent.click(await screen.findByRole('button', { name: 'Sonraki' }));
  await screen.findByText('Sayfa 2 / 3 · 41 kullanıcı');
  fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
  await screen.findByText('Sayfa 3 / 3 · 41 kullanıcı');
  fireEvent.click(
    within(await menu()).getByRole('menuitem', { name: 'Kullanıcıyı sil' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kullanıcıyı sil' }));
  await screen.findByText('Sayfa 2 / 2 · 40 kullanıcı');
  expect(usersAPI.getUsers).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2 }),
  );
});
it('validates shared create rules and never transmits password confirmation', async () => {
  vi.mocked(usersAPI.createUser).mockResolvedValue(response());
  mount();
  await openCreate();
  fillUser();
  fireEvent.change(screen.getByLabelText('Kullanıcı adı'), {
    target: { value: 'bad-name' },
  });
  fireEvent.change(screen.getByLabelText('Parola', { exact: true }), {
    target: { value: 'ü'.repeat(37) },
  });
  save();
  expect(usersAPI.createUser).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText('Kullanıcı adı').getAttribute('aria-invalid'),
  ).toBe('true');
  expect(
    screen
      .getByLabelText('Parola', { exact: true })
      .getAttribute('aria-invalid'),
  ).toBe('true');
  fillUser();
  save();
  await waitFor(() =>
    expect(usersAPI.createUser).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@example.com',
      password: 'fixture-password',
      firstName: 'Deniz',
      lastName: 'Test',
      role: 'student',
      isActive: true,
    }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('retains create input after a rejection and only clears it on a new opening', async () => {
  vi.mocked(usersAPI.createUser).mockRejectedValue(rejected());
  mount();
  await openCreate();
  fillUser();
  save();
  await screen.findByText('İstek tamamlanamadı. Lütfen tekrar deneyin.');
  expect((screen.getByLabelText('E-posta') as HTMLInputElement).value).toBe(
    'new@example.com',
  );
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  await openCreate();
  expect((screen.getByLabelText('E-posta') as HTMLInputElement).value).toBe('');
  expect(
    (screen.getByLabelText('Parola', { exact: true }) as HTMLInputElement)
      .value,
  ).toBe('');
});
it('locks the create form, duplicate writes and dismissal until the server responds', async () => {
  let finish!: (value: Awaited<ReturnType<typeof usersAPI.createUser>>) => void;
  vi.mocked(usersAPI.createUser).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await openCreate();
  fillUser();
  act(() => {
    save();
    save();
  });
  expect(usersAPI.createUser).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Rol').matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(async () => finish(response()));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('does not show success or invalidate account data after a late account acknowledgement', async () => {
  let finish!: (value: Awaited<ReturnType<typeof usersAPI.updateUser>>) => void;
  vi.mocked(usersAPI.updateUser).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { client } = mount();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(
    within(await menu()).getByRole('menuitem', { name: 'Yönetici yap' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Uygula' }));
  auth.epoch++;
  await act(async () => finish(response()));
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('does not apply a late create acknowledgement after the page has unmounted', async () => {
  let finish!: (value: Awaited<ReturnType<typeof usersAPI.createUser>>) => void;
  vi.mocked(usersAPI.createUser).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { client, unmount } = mount();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await openCreate();
  fillUser();
  save();
  unmount();
  await act(async () => finish(response()));
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
