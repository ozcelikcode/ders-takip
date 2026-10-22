import type { User } from '../../types/auth';
import { useLocale } from '../../lib/locale';
import { useText } from '../../store/languageStore';

const AccountInfoCard = ({ user }: { user: User | null }) => {
  const text = useText().profile;
  const { tag } = useLocale();
  return (
  <div className="panel">
    <div className="panel-heading">
      <h2 className="text-sm font-medium">
        {text.accountTitle}
      </h2>
    </div>
    <div className="space-y-2 p-5 text-sm">
      <div className="flex justify-between">
        <span className="text-(--muted)">{text.status}</span>
        <span
          className={`font-medium ${user?.isActive ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {user?.isActive ? text.active : text.inactive}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-(--muted)">{text.joined}</span>
        <span>
          {user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString(tag)
            : '-'}
        </span>
      </div>
      {user?.lastLogin && (
        <div className="flex justify-between">
          <span className="text-(--muted)">
            {text.lastLogin}
          </span>
          <span>
            {new Date(user.lastLogin).toLocaleDateString(tag)}
          </span>
        </div>
      )}
    </div>
  </div>
  );
};

export default AccountInfoCard;
