import { Eye, EyeOff } from 'lucide-react';
import type { User } from '../../types/auth';
import type { useProfileSettings } from './useProfileSettings';

interface ProfileTabProps {
  user: User | null;
  form: ReturnType<typeof useProfileSettings>;
}

const labelClass = 'mb-2 block text-sm font-medium';

const ProfileTab = ({ user, form }: ProfileTabProps) => {
  const {
    fullName,
    setFullName,
    email,
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    updateProfileMutation,
    changePasswordMutation,
    handleProfileSubmit,
    handlePasswordSubmit,
  } = form;
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-medium">Profil bilgileri</h2>
        <form onSubmit={handleProfileSubmit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="settings-fullName" className={labelClass}>Ad Soyad</label>
            <input
              id="settings-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="settings-email" className={labelClass}>E-posta</label>
            <input id="settings-email" type="email" value={email} readOnly className="input bg-[var(--subtle)]" required />
          </div>
          <div>
            <label htmlFor="settings-role" className={labelClass}>Rol</label>
            <input
              id="settings-role"
              type="text"
              value={user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
              className="input bg-[var(--subtle)] text-[var(--muted)]"
              disabled
            />
          </div>
          <button type="submit" disabled={updateProfileMutation.isPending} className="btn btn-primary">
            {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </section>

      <section className="space-y-4 border-t border-[var(--line)] pt-6">
        <h2 className="text-base font-medium">Şifre değiştir</h2>
        {!showPasswordForm ? (
          <button type="button" onClick={() => setShowPasswordForm(true)} className="btn btn-secondary">
            Şifremi Değiştir
          </button>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-4">
            <div>
              <label htmlFor="settings-currentPassword" className={labelClass}>Mevcut Şifre</label>
              <div className="relative">
                <input
                  id="settings-currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-12"
                  required
                />
                <button
                  type="button"
                  aria-label={showCurrentPassword ? 'Mevcut şifreyi gizle' : 'Mevcut şifreyi göster'}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="icon-button absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="settings-newPassword" className={labelClass}>Yeni Şifre</label>
              <div className="relative">
                <input
                  id="settings-newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-12"
                  required
                  minLength={12}
                />
                <button
                  type="button"
                  aria-label={showNewPassword ? 'Yeni şifreyi gizle' : 'Yeni şifreyi göster'}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="icon-button absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">En az 12 karakter olmalıdır</p>
            </div>
            <div>
              <label htmlFor="settings-confirmPassword" className={labelClass}>Yeni Şifre (Tekrar)</label>
              <input
                id="settings-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
                minLength={12}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={changePasswordMutation.isPending} className="btn btn-primary">
                {changePasswordMutation.isPending ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn btn-secondary"
              >
                İptal
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default ProfileTab;
