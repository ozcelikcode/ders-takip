import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAccountMutation } from '../../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../../hooks/useAccountQueryKeys';
import { authAPI } from '../../../services/api';
import { useText } from '../../../store/languageStore';

/** How many other places the account is signed in, and ending them all except this one. */
const SessionsCard = () => {
  const text = useText().profile;
  const keys = useAccountQueryKeys();
  const sessionsKey = keys.resource('auth-sessions');
  const others = useQuery({ queryKey: sessionsKey, queryFn: authAPI.otherSessions });
  const mutation = useAccountMutation([sessionsKey]);
  return (
    <section aria-labelledby="account-sessions-heading" className="panel">
      <div className="panel-heading">
        <h2 id="account-sessions-heading" className="text-sm font-medium">{text.sessionsTitle}</h2>
      </div>
      <div className="space-y-3 p-5 text-sm">
        {others.isPending ? (
          <p role="status" className="text-(--muted)">{text.sessionsLoading}</p>
        ) : others.isError ? (
          <p className="text-red-600">{text.sessionsFailed}</p>
        ) : (
          <>
            <p>{others.data === 0 ? text.sessionsNone : text.sessionsOthers(others.data)}</p>
            {others.data > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={mutation.isPending}
                onClick={() => void mutation.save(authAPI.signOutOthers, text.signedOutOthers)}
              >
                <LogOut className="h-4 w-4" />
                {mutation.isPending ? text.signingOutOthers : text.signOutOthers}
              </button>
            )}
          </>
        )}
        {mutation.errorMessage && <p role="alert" className="text-red-600">{mutation.errorMessage}</p>}
      </div>
    </section>
  );
};

export default SessionsCard;
