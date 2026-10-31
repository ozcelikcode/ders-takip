import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../services/api';
import { CanceledError } from '../services/httpError';
import { useAuthStore } from '../store/authStore';
import { useAccountQueryKeys } from './useAccountQueryKeys';

const recentLimit = 5;

/** The latest completed sessions, newest first and only as many as are shown; the header notifications and the dashboard activity list share one request. */
export const useRecentSessions = () => {
  const keys = useAccountQueryKeys();
  const user = useAuthStore(state => state.user);
  const epoch = useAuthStore(state => state.epoch);
  return useQuery({
    queryKey: keys.sessions('recent-completed'),
    enabled: !!user,
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({ status: 'completed', latest: recentLimit });
      if (useAuthStore.getState().epoch !== epoch) throw new CanceledError('Account changed');
      const sessions = response.data.data?.sessions;
      if (!sessions) throw new Error('Missing recent sessions');
      return sessions;
    },
    refetchInterval: 60_000,
  });
};
