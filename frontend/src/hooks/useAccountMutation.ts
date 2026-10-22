import { useEffect, useRef, useState } from 'react';
import { serverMessage } from '../services/httpError';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export function useAccountMutation(invalidateKeys: readonly QueryKey[]) {
  const client = useQueryClient();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const busy = useRef(false);
  const boundEpoch = useRef(useAuthStore.getState().epoch);
  const [isPending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isCurrent = () =>
    mounted.current && useAuthStore.getState().epoch === boundEpoch.current;
  const save = async (operation: () => Promise<unknown>, message: string) => {
    if (!isCurrent() || busy.current) return false;
    busy.current = true;
    setPending(true);
    setErrorMessage('');
    const epoch = useAuthStore.getState().epoch;
    try {
      await operation();
      if (!mounted.current || useAuthStore.getState().epoch !== epoch)
        return false;
      await Promise.all(
        invalidateKeys.map((queryKey) =>
          client.invalidateQueries({ queryKey }),
        ),
      );
      if (!mounted.current || useAuthStore.getState().epoch !== epoch)
        return false;
      toast.success(message);
      return true;
    } catch (error) {
      if (mounted.current && useAuthStore.getState().epoch === epoch) {
        setErrorMessage(
          serverMessage(error) ?? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
        );
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return {
    save,
    isPending,
    errorMessage,
    isCurrent,
    clearError: () => setErrorMessage(''),
  };
}
