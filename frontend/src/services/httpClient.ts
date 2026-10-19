import axios, { type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { queryClient } from '../lib/queryClient';
import { accountQueryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
  authEpoch?: number;
}
const configuration = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'StudyTracker',
  },
};
export const api = axios.create(configuration);
/** Cookie-only transport for auth routes; it never attaches the access token or retries on 401. */
export const authTransport = axios.create(configuration);
const sessionChannel =
  typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
    ? new window.BroadcastChannel('study-tracker-sessions')
    : null;
sessionChannel?.addEventListener('message', (event) => {
  const current = useAuthStore.getState();
  if (
    event.data?.type === 'sessions-changed' &&
    current.user &&
    event.data.userId === String(current.user.id)
  ) {
    void queryClient.invalidateQueries({
      queryKey: accountQueryKeys(current.user.id, '').sessions(),
    });
  }
});
api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  const request = config as AuthRequest;
  if (request.authEpoch !== undefined && request.authEpoch !== state.epoch)
    throw new axios.CanceledError('Session changed');
  request.authEpoch = state.epoch;
  if (state.accessToken)
    config.headers.Authorization = `Bearer ${state.accessToken}`;
  return request;
});

// Toast debounce to prevent spam
const toastShown = new Set<string>();
const isCatalogRequest = (url?: string) =>
  /^\/(courses|categories|topics)(\/|$)/.test(url ?? '');
const invalidateCatalogViews = (request: AuthRequest) => {
  const current = useAuthStore.getState();
  if (request.authEpoch !== current.epoch) return;
  const keys = accountQueryKeys(current.user?.id, '');
  void queryClient.invalidateQueries({ queryKey: keys.catalog() });
  void queryClient.invalidateQueries({ queryKey: keys.sessions() });
};

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    const current = useAuthStore.getState();
    if (
      response.config.url?.startsWith('/study-sessions') &&
      ['post', 'put', 'patch', 'delete'].includes(
        response.config.method ?? '',
      ) &&
      (response.config as AuthRequest).authEpoch === current.epoch
    ) {
      void queryClient.invalidateQueries({
        queryKey: accountQueryKeys(current.user?.id, '').sessions(),
      });
      if (current.user)
        sessionChannel?.postMessage({
          type: 'sessions-changed',
          userId: String(current.user.id),
        });
    }
    if (
      isCatalogRequest(response.config.url) &&
      ['post', 'put', 'delete'].includes(response.config.method ?? '')
    ) {
      invalidateCatalogViews(response.config as AuthRequest);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AuthRequest | undefined;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const state = useAuthStore.getState();
      if (!state.isAuthenticated || state.epoch !== originalRequest.authEpoch)
        return Promise.reject(error);
      try {
        const token =
          state.accessToken &&
          originalRequest.headers.Authorization !==
            `Bearer ${state.accessToken}`
            ? state.accessToken
            : await state.refreshSession();
        if (useAuthStore.getState().epoch !== originalRequest.authEpoch)
          return Promise.reject(new axios.CanceledError('Session changed'));
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest?.authEpoch === useAuthStore.getState().epoch
    )
      useAuthStore.getState().clearAuth();

    const current = useAuthStore.getState();
    if (
      error.response?.status === 409 &&
      originalRequest &&
      isCatalogRequest(originalRequest.url)
    )
      invalidateCatalogViews(originalRequest);
    if (
      error.response?.status === 409 &&
      originalRequest?.url?.startsWith('/study-sessions') &&
      originalRequest.authEpoch === current.epoch
    ) {
      void queryClient.invalidateQueries({
        queryKey: accountQueryKeys(current.user?.id, '').sessions(),
      });
    }

    // Handle common errors with debouncing
    let errorMessage: string;
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message === 'Network Error') {
      errorMessage =
        'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
    } else {
      errorMessage = 'Beklenmeyen bir hata oluştu';
    }

    // Prevent duplicate toast messages
    const errorKey = `${error.config?.url || 'unknown'}-${errorMessage}`;
    if (!toastShown.has(errorKey)) {
      toastShown.add(errorKey);
      toast.error(errorMessage);

      // Clear the error after 10 seconds to allow showing it again
      setTimeout(() => {
        toastShown.delete(errorKey);
      }, 10000);
    }

    return Promise.reject(error);
  },
);
