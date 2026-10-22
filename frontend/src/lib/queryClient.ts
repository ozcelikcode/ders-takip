import { QueryClient } from '@tanstack/react-query';
import { isHttpError } from '../services/httpError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 15,
      retry: (failureCount, error) => {
        if (isHttpError(error) && error.response && error.response.status >= 400 && error.response.status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
