import toast from 'react-hot-toast';
import { queryClient } from '../lib/queryClient';
import { accountQueryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../store/authStore';
import { CanceledError, HttpError, isHttpError, type HttpRequestConfig, type HttpResponse } from './httpError';
import { serverMessage } from '../lib/messages';
import { useLanguageStore } from '../store/languageStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TIMEOUT_MS = 30000;

type QueryValue = string | number | boolean | null | undefined;

const buildUrl = (url: string, params?: object) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries((params ?? {}) as Record<string, QueryValue>))
    if (value !== undefined && value !== null) search.append(key, String(value));
  const query = search.toString();
  return `${API_BASE_URL}${url}${query ? `?${query}` : ''}`;
};
const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/** Reads a fetch outcome as the API's response, or as an HttpError. */
const receive = async <T>(
  pending: Promise<Response>,
  config: HttpRequestConfig,
  isTimeout: (error: unknown) => boolean,
): Promise<HttpResponse<T>> => {
  let response: Response;
  try {
    response = await pending;
  } catch (error) {
    throw isTimeout(error)
      ? new HttpError(`timeout of ${TIMEOUT_MS}ms exceeded`, undefined, config, 'ECONNABORTED')
      : new HttpError('Network Error', undefined, config, 'ERR_NETWORK');
  }
  const data = await readBody(response);
  if (!response.ok)
    throw new HttpError(
      `Request failed with status code ${response.status}`,
      { status: response.status, data: (data && typeof data === 'object' ? data : {}) },
      config,
      'ERR_BAD_RESPONSE',
    );
  return { data: data as T, status: response.status, config };
};

/** One fetch round trip with the API's headers, cookies, timeout and JSON handling. */
const send = async <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const pending = fetch(buildUrl(config.url, config.params), {
    method: (config.method ?? 'get').toUpperCase(),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'StudyTracker', ...config.headers },
    ...(config.data === undefined ? {} : { body: JSON.stringify(config.data) }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  return receive<T>(pending, config, () => controller.signal.aborted);
};

/** Reads an auth request that index.html sent with the same headers and a timeout signal before the scripts loaded. */
export const receiveAuthResponse = <T>(pending: Promise<Response>, config: HttpRequestConfig): Promise<HttpResponse<T>> =>
  receive<T>(pending, config, error => error instanceof DOMException && error.name === 'TimeoutError');

interface Transport {
  get<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;
  delete<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;
  post<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;
  put<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;
  patch<T = unknown>(url: string, data?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;
}
const transport = (request: <T>(config: HttpRequestConfig) => Promise<HttpResponse<T>>): Transport => ({
  get: (url, config) => request({ ...config, url, method: 'get' }),
  delete: (url, config) => request({ ...config, url, method: 'delete' }),
  post: (url, data, config) => request({ ...config, url, data, method: 'post' }),
  put: (url, data, config) => request({ ...config, url, data, method: 'put' }),
  patch: (url, data, config) => request({ ...config, url, data, method: 'patch' }),
});

/** Cookie-only transport for auth routes; it never attaches the access token or retries on 401. */
export const authTransport = transport(send);

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

// Toast debounce to prevent spam
const toastShown = new Set<string>();
const isCatalogRequest = (url?: string) =>
  /^\/(courses|categories|topics)(\/|$)/.test(url ?? '');
const invalidateCatalogViews = (request: HttpRequestConfig) => {
  const current = useAuthStore.getState();
  if (request.authEpoch !== current.epoch) return;
  const keys = accountQueryKeys(current.user?.id, '');
  void queryClient.invalidateQueries({ queryKey: keys.catalog() });
  void queryClient.invalidateQueries({ queryKey: keys.sessions() });
};

// Routine writes create, rebuild or remove sessions, so they refresh the same views as session writes.
const changesSessions = (url: string) => url.startsWith('/study-sessions') || url.startsWith('/session-series');

const afterSuccess = (config: HttpRequestConfig) => {
  const current = useAuthStore.getState();
  const method = config.method ?? 'get';
  if (
    changesSessions(config.url) &&
    method !== 'get' &&
    config.authEpoch === current.epoch
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
  if (isCatalogRequest(config.url) && ['post', 'put', 'delete'].includes(method))
    invalidateCatalogViews(config);
};

const afterFailure = (error: HttpError) => {
  const config = error.config;
  const status = error.response?.status;
  if (status === 401 && config?.authEpoch === useAuthStore.getState().epoch)
    useAuthStore.getState().clearAuth();

  const current = useAuthStore.getState();
  if (status === 409 && config && isCatalogRequest(config.url)) invalidateCatalogViews(config);
  if (
    status === 409 &&
    config && changesSessions(config.url) &&
    config.authEpoch === current.epoch
  ) {
    void queryClient.invalidateQueries({
      queryKey: accountQueryKeys(current.user?.id, '').sessions(),
    });
  }

  // Handle common errors with debouncing
  const text = useLanguageStore.getState().text.errors;
  const errorMessage = serverMessage(error) ?? (error.code === 'ERR_NETWORK' ? text.network : text.unexpected);

  // Prevent duplicate toast messages
  const errorKey = `${config?.url || 'unknown'}-${errorMessage}`;
  if (!toastShown.has(errorKey)) {
    toastShown.add(errorKey);
    toast.error(errorMessage);

    // Clear the error after 10 seconds to allow showing it again
    setTimeout(() => {
      toastShown.delete(errorKey);
    }, 10000);
  }
};

/**
 * The account transport: it sends the in-memory access token, refreshes it once on a 401,
 * drops requests from a previous account, refreshes the views a write affects and reports failures.
 */
const request = async <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
  const state = useAuthStore.getState();
  if (config.authEpoch !== undefined && config.authEpoch !== state.epoch)
    throw new CanceledError('Session changed');
  const sent: HttpRequestConfig = {
    ...config,
    authEpoch: state.epoch,
    headers: { ...config.headers, ...(state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {}) },
  };
  try {
    const response = await send<T>(sent);
    afterSuccess(sent);
    return response;
  } catch (error) {
    if (!isHttpError(error)) throw error;
    if (error.response?.status === 401 && !sent.retried) {
      const current = useAuthStore.getState();
      if (!current.isAuthenticated || current.epoch !== sent.authEpoch) throw error;
      const token =
        current.accessToken && sent.headers?.Authorization !== `Bearer ${current.accessToken}`
          ? current.accessToken
          : await current.refreshSession();
      if (useAuthStore.getState().epoch !== sent.authEpoch)
        throw new CanceledError('Session changed');
      return request<T>({ ...sent, retried: true, headers: { ...sent.headers, Authorization: `Bearer ${token}` } });
    }
    afterFailure(error);
    throw error;
  }
};

export const api = transport(request);
