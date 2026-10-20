import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AccountDataCard from '../src/pages/profile/AccountDataCard';
import { authAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/services/api', () => ({ authAPI: { exportAccount: vi.fn(), deleteAccount: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<AccountDataCard />} />
        <Route path="/login" element={<p>Giriş sayfası</p>} />
      </Routes>
    </MemoryRouter>,
  );
const axiosError = (message: string) => Object.assign(new Error(message), { isAxiosError: true, response: { data: { error: { message } } } });

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
  vi.mocked(authAPI.deleteAccount).mockRejectedValueOnce(axiosError('Şifre hatalı')).mockResolvedValueOnce({} as never);
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
