import { forgotPasswordSchema, type ForgotPasswordResponse } from '@study-tracker/contracts';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import { authAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { issueMessage } from '../../lib/messages';

export default function ForgotPasswordPage() {
  const auth = useText().auth;
  const text = auth.forgot;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [delivery, setDelivery] = useState<ForgotPasswordResponse['delivery'] | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0] ? issueMessage(parsed.error.issues[0].message) : text.checkEmail);
      return;
    }
    setError('');
    setPending(true);
    try {
      setDelivery((await authAPI.forgotPassword(parsed.data)).delivery);
    } catch {
      setError(text.failed);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title={text.title} description={text.description}>
      {delivery === 'email' ? (
        <p role="status" className="text-sm">{text.sentByEmail}</p>
      ) : delivery === 'admin' ? (
        <p role="status" className="text-sm">{text.askAdmin}</p>
      ) : (
        <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-medium">{auth.email}</label>
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
            {pending ? text.submitting : text.submit}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium underline underline-offset-4">{text.backToLogin}</Link>
      </p>
    </AuthCard>
  );
}
