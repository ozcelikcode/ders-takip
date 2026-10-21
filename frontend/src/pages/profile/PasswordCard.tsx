import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { PasswordFormState } from './profileForm';

interface PasswordCardProps {
  isEditingPassword: boolean;
  setIsEditingPassword: (editing: boolean) => void;
  passwordForm: PasswordFormState;
  setPasswordForm: (form: PasswordFormState) => void;
  isPending: boolean;
  onSubmit: (event: FormEvent) => void;
}

const emptyForm: PasswordFormState = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordField({
  id,
  label,
  value,
  onChange,
  revealLabel,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  revealLabel?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={id === 'profile-currentPassword' ? undefined : 12}
          className={revealLabel ? 'input pr-12' : 'input'}
        />
        {revealLabel && (
          <button
            type="button"
            aria-label={`${revealLabel} ${visible ? 'gizle' : 'göster'}`}
            onClick={() => setVisible(!visible)}
            className="icon-button absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-(--muted)">{hint}</p>}
    </div>
  );
}

const PasswordCard = ({
  isEditingPassword,
  setIsEditingPassword,
  passwordForm,
  setPasswordForm,
  isPending,
  onSubmit,
}: PasswordCardProps) => (
  <div className="panel">
    <div className="panel-heading">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-(--muted)" />
        <h2 className="text-base font-medium">Şifre Değiştir</h2>
      </div>
      {!isEditingPassword && (
        <button onClick={() => setIsEditingPassword(true)} className="btn btn-secondary px-3 py-1.5 text-sm">
          Değiştir
        </button>
      )}
    </div>
    {isEditingPassword && (
      <div className="p-5">
        <form onSubmit={onSubmit} className="max-w-xl space-y-4">
          <PasswordField
            id="profile-currentPassword"
            label="Mevcut Şifre *"
            revealLabel="Mevcut şifreyi"
            value={passwordForm.currentPassword}
            onChange={(currentPassword) => setPasswordForm({ ...passwordForm, currentPassword })}
          />
          <PasswordField
            id="profile-newPassword"
            label="Yeni Şifre *"
            revealLabel="Yeni şifreyi"
            hint="En az 12 karakter olmalıdır"
            value={passwordForm.newPassword}
            onChange={(newPassword) => setPasswordForm({ ...passwordForm, newPassword })}
          />
          <PasswordField
            id="profile-confirmPassword"
            label="Yeni Şifre (Tekrar) *"
            value={passwordForm.confirmPassword}
            onChange={(confirmPassword) => setPasswordForm({ ...passwordForm, confirmPassword })}
          />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn btn-primary">
              <Lock className="h-4 w-4" />
              {isPending ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordForm(emptyForm);
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

export default PasswordCard;
