import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AccountTab from '../src/pages/settings/account/AccountTab';
import UserSettingsPage from '../src/pages/settings/UserSettingsPage';
import { authAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/services/api', () => ({ authAPI: { changePassword: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mount = (page: ReactElement) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        {page}
      </QueryClientProvider>
    </MemoryRouter>,
  );
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  useAuthStore.setState({
    user: {
      id: '1',
      username: 'ada',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Kaya',
      fullName: 'Ada Kaya',
      role: 'student',
      isActive: true,
      preferences: defaultPreferences,
    } as never,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('keeps password changes in the account tab with reveal toggles and shared validation', async () => {
  vi.mocked(authAPI.changePassword).mockResolvedValue({} as never);
  mount(<AccountTab />);
  fireEvent.click(screen.getByRole('button', { name: 'Değiştir' }));
  type('Mevcut Şifre *', 'old-password');
  fireEvent.click(screen.getByRole('button', { name: 'Mevcut şifreyi göster' }));
  expect((screen.getByLabelText('Mevcut Şifre *') as HTMLInputElement).type).toBe('text');
  type('Yeni Şifre *', 'new-password-123');
  type('Yeni Şifre (Tekrar) *', 'different-password');
  fireEvent.submit(screen.getByRole('button', { name: 'Şifreyi Değiştir' }).closest('form')!);
  expect(toast.error).toHaveBeenCalledWith('Yeni şifreler eşleşmiyor');
  expect(authAPI.changePassword).not.toHaveBeenCalled();
  type('Yeni Şifre (Tekrar) *', 'new-password-123');
  fireEvent.submit(screen.getByRole('button', { name: 'Şifreyi Değiştir' }).closest('form')!);
  await waitFor(() =>
    expect(authAPI.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password', newPassword: 'new-password-123' }),
  );
});

it('opens settings on the account tab, which holds the only name and password forms', () => {
  mount(<UserSettingsPage />);
  expect(screen.getByRole('button', { name: 'Hesap' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getAllByRole('button', { name: 'Değiştir' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Görünüm' }));
  expect(screen.queryByRole('button', { name: 'Değiştir' })).toBeNull();
});

it('keeps an edited study draft when stored preferences refresh, and follows them while unedited', async () => {
  const { useUserPreferencesStore } = await import('../src/store/userPreferencesStore');
  render(
    <MemoryRouter initialEntries={['/settings?tab=study']}>
      <QueryClientProvider client={new QueryClient()}>
        <UserSettingsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  const shortBreak = () => screen.getByLabelText('Kısa Mola Süresi (dk)') as HTMLInputElement;
  const refresh = (patch: object) =>
    act(() => useUserPreferencesStore.setState((state) => ({ preferences: { ...state.preferences, ...patch } })));
  refresh({ defaultShortBreak: 7 });
  expect(shortBreak().value).toBe('7');
  fireEvent.change(shortBreak(), { target: { value: '9' } });
  refresh({ defaultShortBreak: 8 });
  expect(shortBreak().value).toBe('9');
});
