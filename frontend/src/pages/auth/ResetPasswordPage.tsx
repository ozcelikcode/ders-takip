import { passwordResetTokenSchema, resetPasswordSchema } from '@study-tracker/contracts';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import { authAPI } from '../../services/api';

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const validLink = passwordResetTokenSchema.safeParse(token).success;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Şifreyi kontrol edin');
      return;
    }
    setError('');
    setPending(true);
    try {
      await authAPI.resetPassword(parsed.data);
      toast.success('Şifre güncellendi. Yeni şifrenizle giriş yapın.');
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(
        (isAxiosError(failure) ? failure.response?.data?.error?.message : undefined) ??
          'Şifre güncellenemedi. Lütfen tekrar deneyin.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title="Yeni şifre belirle" description="Bağlantı tek kullanımlıktır ve 30 dakika geçerlidir.">
      {!validLink ? (
        <p role="alert" className="text-sm">
          Bağlantı geçersiz. <Link to="/forgot-password" className="font-medium underline underline-offset-4">Yeni bağlantı isteyin</Link>.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <label htmlFor="reset-password" className="mb-2 block text-sm font-medium">Yeni Şifre</label>
            <input id="reset-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} />
            <p className="mt-1 text-xs text-[var(--muted)]">En az 12 karakter olmalıdır</p>
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-2 block text-sm font-medium">Yeni Şifre (Tekrar)</label>
            <input id="reset-confirm" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
