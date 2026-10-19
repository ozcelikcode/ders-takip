import { Lock } from 'lucide-react';
import type { FormEvent } from 'react';
import type { PasswordFormState } from './profileForm';

interface PasswordCardProps {
  isEditingPassword: boolean;
  setIsEditingPassword: (editing: boolean) => void;
  passwordForm: PasswordFormState;
  setPasswordForm: (form: PasswordFormState) => void;
  isPending: boolean;
  onSubmit: (event: FormEvent) => void;
}

const PasswordCard = ({
  isEditingPassword,
  setIsEditingPassword,
  passwordForm,
  setPasswordForm,
  isPending,
  onSubmit: handlePasswordSubmit,
}: PasswordCardProps) => {
  return (
  <div className="panel">
    <div className="panel-heading">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-[var(--muted)]" />
        <h2 className="text-base font-medium">
          Şifre Değiştir
        </h2>
      </div>
      {!isEditingPassword && (
        <button
          onClick={() => setIsEditingPassword(true)}
          className="btn btn-secondary text-sm py-1.5 px-3"
        >
          Değiştir
        </button>
      )}
    </div>
    {isEditingPassword && (
      <div className="p-5">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-currentPassword" className="mb-2 block text-sm font-medium">
              Mevcut Şifre *
            </label>
            <input id="profile-currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor="profile-newPassword" className="mb-2 block text-sm font-medium">
              Yeni Şifre *
            </label>
            <input id="profile-newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              required
              minLength={12}
              className="input"
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              En az 12 karakter olmalıdır
            </p>
          </div>
          <div>
            <label htmlFor="profile-confirmPassword" className="mb-2 block text-sm font-medium">
              Yeni Şifre (Tekrar) *
            </label>
            <input id="profile-confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              required
              className="input"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {isPending
                ? 'Değiştiriliyor...'
                : 'Şifreyi Değiştir'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setIsEditingPassword(false);
              }}
              disabled={isPending}
              className="btn btn-secondary"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    )}
  </div>
  );
};

export default PasswordCard;
