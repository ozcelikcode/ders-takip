import { forgotPasswordSchema, type ForgotPasswordResponse } from '@study-tracker/contracts';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import { authAPI } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [delivery, setDelivery] = useState<ForgotPasswordResponse['delivery'] | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'E-posta adresini kontrol edin');
      return;
    }
    setError('');
    setPending(true);
    try {
      setDelivery((await authAPI.forgotPassword(parsed.data)).delivery);
    } catch {
      setError('İstek gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title="Şifremi unuttum" description="Hesabınızın e-posta adresini girin.">
      {delivery === 'email' ? (
        <p role="status" className="text-sm">
          Bu adrese kayıtlı etkin bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Bağlantı 30 dakika geçerlidir.
          E-posta gelmezse gereksiz klasörünü kontrol edin veya yöneticinize başvurun.
        </p>
      ) : delivery === 'admin' ? (
        <p role="status" className="text-sm">
          Bu sitede e-posta gönderimi yapılandırılmamış. Yöneticinizden kullanıcı listesindeki
          “Şifre sıfırlama bağlantısı” ile size tek kullanımlık bir bağlantı oluşturmasını isteyin.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium">E-posta Adresi</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              aria-invalid={!!error}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı iste'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium underline underline-offset-4">Girişe dön</Link>
      </p>
    </AuthCard>
  );
}
