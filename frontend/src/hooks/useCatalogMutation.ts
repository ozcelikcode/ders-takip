import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAccountQueryKeys } from './useAccountQueryKeys';
import { useAuthStore } from '../store/authStore';

export function useCatalogMutation() {
  const client = useQueryClient();
  const keys = useAccountQueryKeys();
  const busy = useRef(false);
  const boundEpoch = useRef(useAuthStore.getState().epoch);
  const [isPending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const save = async (operation: () => Promise<unknown>, message: string) => {
    if (busy.current || useAuthStore.getState().epoch !== boundEpoch.current)
      return false;
    busy.current = true;
    setPending(true);
    setErrorMessage('');
    const epoch = useAuthStore.getState().epoch;
    try {
      await operation();
      if (useAuthStore.getState().epoch !== epoch) return false;
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.catalog() }),
        client.invalidateQueries({ queryKey: keys.sessions() }),
        client.invalidateQueries({ queryKey: keys.resource('topic-progress') }),
      ]);
      if (useAuthStore.getState().epoch !== epoch) return false;
      toast.success(message);
      return true;
    } catch (error) {
      if (useAuthStore.getState().epoch === epoch) {
        setErrorMessage(
          isAxiosError<{ error?: { message?: string } }>(error)
            ? (error.response?.data?.error?.message ??
                'İşlem tamamlanamadı. Lütfen tekrar deneyin.')
            : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
        );
      }
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return { save, isPending, errorMessage };
}
