import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LoginPage from '../src/pages/auth/LoginPage';
import RegisterPage from '../src/pages/auth/RegisterPage';
const auth = vi.hoisted(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: false,
}));
vi.mock('../src/store/authStore', () => ({ useAuthStore: () => auth }));
vi.mock('../src/store/settingsStore', () => ({
  useSettingsStore: (
    select: (state: { settings: { allowRegistration: boolean } }) => unknown,
  ) => select({ settings: { allowRegistration: true } }),
}));
vi.mock('../src/components/common/Brand', () => ({
  Brand: () => <span>Fixture brand</span>,
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
it('allows existing short login passwords while validating email through the shared contract', async () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
  fill('E-posta Adresi', 'fixture@example.com');
  fill('Şifre', 'old');
  fireEvent.submit(
    screen.getByRole('button', { name: 'Giriş Yap' }).closest('form')!,
  );
  await waitFor(() =>
    expect(auth.login).toHaveBeenCalledWith({
      email: 'fixture@example.com',
      password: 'old',
    }),
  );
});
it('blocks registration identifiers that the API rejects and submits normalized valid names', async () => {
  // The browser's zone travels with the registration so new accounts start in local time.
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat().resolvedOptions(),
    timeZone: 'America/New_York',
  });
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  fill('Ad', ' Test ');
  fill('Soyad', ' User ');
  fill('Kullanıcı Adı', 'invalid-name');
  fill('E-posta Adresi', 'fixture@example.com');
  fill('Şifre', 'fixture-password');
  const submit = () =>
    fireEvent.submit(
      screen.getByRole('button', { name: 'Kayıt Ol' }).closest('form')!,
    );
  submit();
  await screen.findByText(
    'Kullanıcı adı yalnızca İngilizce harf ve rakam içerebilir',
  );
  expect(auth.register).not.toHaveBeenCalled();
  fill('Kullanıcı Adı', ' fixture ');
  submit();
  await waitFor(() =>
    expect(auth.register).toHaveBeenCalledWith({
      firstName: 'Test',
      lastName: 'User',
      username: 'fixture',
      email: 'fixture@example.com',
      password: 'fixture-password',
      timezone: 'America/New_York',
    }),
  );
});
it('rejects bcrypt-truncated multibyte registration passwords before HTTP submission', async () => {
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
  fill('Ad', 'Test');
  fill('Soyad', 'User');
  fill('Kullanıcı Adı', 'fixture');
  fill('E-posta Adresi', 'fixture@example.com');
  fill('Şifre', 'ü'.repeat(37));
  fireEvent.submit(
    screen.getByRole('button', { name: 'Kayıt Ol' }).closest('form')!,
  );
  await screen.findByText('Şifre en fazla 72 UTF-8 baytı olabilir');
  expect(auth.register).not.toHaveBeenCalled();
});
