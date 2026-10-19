import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProfilePage from '../src/pages/profile/ProfilePage';
import UserSettingsPage from '../src/pages/settings/UserSettingsPage';
import { authAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/services/api', () => ({ authAPI: { changePassword: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mount = (page: JSX.Element) =>
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

it('keeps password changes on the profile page with reveal toggles and shared validation', async () => {
  vi.mocked(authAPI.changePassword).mockResolvedValue({} as never);
  mount(<ProfilePage />);
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

it('offers no second name or password form in settings and links to the profile instead', () => {
  mount(<UserSettingsPage />);
  expect(screen.queryByLabelText(/Şifre/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Profil' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Profil' }).getAttribute('href')).toBe('/profile');
});
