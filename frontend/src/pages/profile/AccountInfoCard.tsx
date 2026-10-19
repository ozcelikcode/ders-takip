import type { User } from '../../types/auth';

const AccountInfoCard = ({ user }: { user: User | null }) => {
  return (
  <div className="panel">
    <div className="panel-heading">
      <h2 className="text-sm font-medium">
        Hesap Bilgileri
      </h2>
    </div>
    <div className="space-y-2 p-5 text-sm">
      <div className="flex justify-between">
        <span className="text-[var(--muted)]">Durum:</span>
        <span
          className={`font-medium ${user?.isActive ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {user?.isActive ? 'Aktif' : 'Pasif'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--muted)]">Kayıt:</span>
        <span>
          {user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString('tr-TR')
            : '-'}
        </span>
      </div>
      {user?.lastLogin && (
        <div className="flex justify-between">
          <span className="text-[var(--muted)]">
            Son Giriş:
          </span>
          <span>
            {new Date(user.lastLogin).toLocaleDateString('tr-TR')}
          </span>
        </div>
      )}
    </div>
  </div>
  );
};

export default AccountInfoCard;
