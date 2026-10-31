import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import PasswordResetLinkDialog from '../src/components/admin/PasswordResetLinkDialog';
import ForgotPasswordPage from '../src/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../src/pages/auth/ResetPasswordPage';
import { authAPI, usersAPI } from '../src/services/api';

vi.mock('../src/services/api', () => ({
  authAPI: { forgotPassword: vi.fn(), resetPassword: vi.fn() },
  usersAPI: { createPasswordResetLink: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const token = 'a'.repeat(43);
const route = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<p>Giriş sayfası</p>} />
      </Routes>
    </MemoryRouter>,
  );
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([
  ['email', /bağlantısı gönderildi/],
  ['admin', /e-posta gönderimi yapılandırılmamış/],
] as const)('explains %s delivery without revealing whether the account exists', async (delivery, message) => {
  vi.mocked(authAPI.forgotPassword).mockResolvedValue({ delivery });
  route('/forgot-password');
  fireEvent.change(screen.getByLabelText('E-posta Adresi'), { target: { value: 'not-an-email' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sıfırlama bağlantısı iste' }));
  expect(screen.getByRole('alert').textContent).toMatch(/Geçerli bir e-posta/);
  expect(authAPI.forgotPassword).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('E-posta Adresi'), { target: { value: ' ada@example.com ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sıfırlama bağlantısı iste' }));
  expect((await screen.findByRole('status')).textContent).toMatch(message);
  expect(authAPI.forgotPassword).toHaveBeenCalledWith({ email: 'ada@example.com' });
});

it('rejects malformed links and mismatched passwords, then signs in fresh after a reset', async () => {
  route('/reset-password?token=short');
  expect(screen.getByRole('alert').textContent).toMatch(/Bağlantı geçersiz/);
  cleanup();
  vi.mocked(authAPI.resetPassword).mockResolvedValue({} as never);
  route(`/reset-password?token=${token}`);
  fireEvent.change(screen.getByLabelText('Yeni Şifre'), { target: { value: 'new-fixture-password' } });
  fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'other-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Şifreyi güncelle' }));
  expect(screen.getByRole('alert').textContent).toBe('Yeni şifreler eşleşmiyor');
  fireEvent.change(screen.getByLabelText('Yeni Şifre (Tekrar)'), { target: { value: 'new-fixture-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Şifreyi güncelle' }));
  await screen.findByText('Giriş sayfası');
  expect(authAPI.resetPassword).toHaveBeenCalledWith({ token, password: 'new-fixture-password' });
});

it('creates an admin link only on request and offers it for copying', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  vi.mocked(usersAPI.createPasswordResetLink).mockResolvedValue({
    url: `http://app.test/reset-password?token=${token}`,
    expiresAt: '2026-10-19T12:30:00.000Z',
  });
  render(<PasswordResetLinkDialog userId="7" name="Ada Kaya" targetIsAdmin={false} onClose={vi.fn()} />);
  expect(usersAPI.createPasswordResetLink).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Bağlantı oluştur' }));
  expect(((await screen.findByLabelText('Bağlantı')) as HTMLInputElement).value).toContain(token);
  fireEvent.click(screen.getByRole('button', { name: 'Kopyala' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`http://app.test/reset-password?token=${token}`));
  expect(usersAPI.createPasswordResetLink).toHaveBeenCalledWith('7', undefined);
});

it('asks for the acting administrator password before a link for another administrator', async () => {
  vi.mocked(usersAPI.createPasswordResetLink).mockResolvedValue({
    url: `http://app.test/reset-password?token=${token}`,
    expiresAt: '2026-10-19T12:30:00.000Z',
  });
  render(<PasswordResetLinkDialog userId="9" name="Deniz Ak" targetIsAdmin onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Bağlantı oluştur' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(usersAPI.createPasswordResetLink).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Onay için şifren'), { target: { value: 'manager-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Bağlantı oluştur' }));
  await screen.findByLabelText('Bağlantı');
  expect(usersAPI.createPasswordResetLink).toHaveBeenCalledWith('9', 'manager-password');
});
