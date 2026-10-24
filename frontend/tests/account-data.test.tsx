import type { ApiErrorCode } from '@study-tracker/contracts';
import { HttpError } from '../src/services/httpError';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AccountDataCard from '../src/pages/profile/AccountDataCard';
import { authAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/services/api', () => ({ authAPI: { exportAccount: vi.fn(), importAccount: vi.fn(), deleteAccount: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<AccountDataCard />} />
          <Route path="/login" element={<p>Giriş sayfası</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
const choose = (container: HTMLElement, content: string) =>
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File([content], 'hesap-verisi.json', { type: 'application/json' })] } });
const imported = (unlinked: number, preferences: 'imported' | 'skipped') => ({
  result: {
    created: { categories: 1, courses: 2, topics: 1, plans: 0, routines: 1, sessions: 12, tags: 1, courseGoals: 0, topicProgress: 0 },
    matchedShared: 1,
    unlinked,
    preferences,
  },
  user: { id: '7', preferences: { onboarding: 'done' } },
});
const serverError = (code: ApiErrorCode) => new HttpError(code, { status: 400, data: { error: { code } } });

beforeEach(() => {
  useAuthStore.setState({ clearAuth: vi.fn() });
  URL.createObjectURL = vi.fn(() => 'blob:export');
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it('downloads the export as a dated JSON file', async () => {
  vi.mocked(authAPI.exportAccount).mockResolvedValue({ format: 'study-tracker-account-export', version: 1, exportedAt: '2026-10-21T08:00:00.000Z' } as never);
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
  expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('hesap-verisi-2026-10-21.json');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
  expect(toast.success).toHaveBeenCalledWith('Verilerin indirildi.');
});

it('deletes the account only after the password is confirmed, then signs out', async () => {
  vi.mocked(authAPI.deleteAccount).mockRejectedValueOnce(serverError('wrongPassword')).mockResolvedValueOnce({} as never);
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Hesabı sil' }));
  const dialog = await screen.findByRole('dialog', { name: 'Hesabı sil' });
  const confirm = within(dialog).getByRole('button', { name: 'Hesabımı kalıcı olarak sil' });

  fireEvent.click(confirm);
  expect((await within(dialog).findByRole('alert')).textContent).toBe('Şifrenizi girin.');
  expect(authAPI.deleteAccount).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText('Onay için şifren'), { target: { value: 'wrong' } });
  fireEvent.click(confirm);
  expect((await within(dialog).findByRole('alert')).textContent).toBe('Şifre hatalı');
  expect(useAuthStore.getState().clearAuth).not.toHaveBeenCalled();

  fireEvent.change(within(dialog).getByLabelText('Onay için şifren'), { target: { value: 'right-password' } });
  fireEvent.click(confirm);
  expect(await screen.findByText('Giriş sayfası')).toBeTruthy();
  expect(authAPI.deleteAccount).toHaveBeenLastCalledWith({ password: 'right-password' });
  expect(useAuthStore.getState().clearAuth).toHaveBeenCalledTimes(1);
});

it('loads a downloaded file into the account and says what came over and what did not', async () => {
  vi.mocked(authAPI.importAccount).mockResolvedValue(imported(2, 'skipped') as never);
  const { container } = mount();
  choose(container, '{"format":"study-tracker-account-export","version":2}');
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Verilerin yüklendi: 12 seans, 3 ders.'));
  expect(authAPI.importAccount).toHaveBeenCalledWith({ format: 'study-tracker-account-export', version: 2 });
  expect(toast).toHaveBeenCalledWith('2 bağlantı bu sitede karşılık bulamadığı için dışarıda kaldı.');
  expect(toast).toHaveBeenCalledWith('Dosyadaki tercihler okunamadı; mevcut tercihlerin korundu.');
  expect(useAuthStore.getState().user?.id).toBe('7');
  expect(screen.queryByRole('alert')).toBeNull();
});

it('explains a file it cannot read and an account the server will not fill', async () => {
  const { container } = mount();
  choose(container, 'not json');
  expect((await screen.findByRole('alert')).textContent).toBe('Bu dosya okunamadı. "Verilerimi indir" ile alınan .json dosyasını seç.');
  expect(authAPI.importAccount).not.toHaveBeenCalled();

  vi.mocked(authAPI.importAccount).mockRejectedValueOnce(new HttpError('accountNotEmpty', { status: 409, data: { error: { code: 'accountNotEmpty' } } }));
  choose(container, '{}');
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Veriler yalnız boş bir hesaba yüklenebilir; bu hesapta zaten veri var'));
  expect(screen.getByRole('button', { name: 'Dosya seç' }).hasAttribute('disabled')).toBe(false);
});
