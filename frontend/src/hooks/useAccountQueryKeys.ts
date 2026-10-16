import { useMemo } from 'react';
import { accountQueryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';
import { useUserPreferencesStore } from '../store/userPreferencesStore';
export const useAccountQueryKeys = () => {
  const id = useAuthStore(state => state.user?.id);
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  return useMemo(() => accountQueryKeys(id === undefined ? undefined : String(id), timezone), [id, timezone]);
};
