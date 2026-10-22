import { passwordResetTokenSchema, resetPasswordSchema } from '@study-tracker/contracts';
import { serverMessage } from '../../services/httpError';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import { authAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get('token') ?? '';
  const navigate = useNavigate();
  const text = useText().auth.reset;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const validLink = passwordResetTokenSchema.safeParse(token).success;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError(text.mismatch);
      return;
    }
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? text.checkPassword);
      return;
    }
    setError('');
    setPending(true);
    try {
      await authAPI.resetPassword(parsed.data);
      toast.success(text.success);
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(
        serverMessage(failure) ?? text.failed,
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title={text.title} description={text.description}>
      {!validLink ? (
        <p role="alert" className="text-sm">
          {text.invalidLink} <Link to="/forgot-password" className="font-medium underline underline-offset-4">{text.requestNew}</Link>.
        </p>
      ) : (
        <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
          <div>
            <label htmlFor="reset-password" className="mb-2 block text-sm font-medium">{text.newPassword}</label>
            <input id="reset-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} />
            <p className="mt-1 text-xs text-(--muted)">{text.newPasswordHint}</p>
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-2 block text-sm font-medium">{text.confirmPassword}</label>
            <input id="reset-confirm" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? text.submitting : text.submit}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
