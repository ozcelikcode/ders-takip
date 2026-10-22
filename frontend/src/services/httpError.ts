/** HTTP error and response shapes shared by the transport, the API modules and their callers; free of side effects. */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface HttpRequestConfig {
  method?: HttpMethod;
  url: string;
  params?: object | undefined;
  data?: unknown;
  headers?: Record<string, string>;
  /** Set once a 401 has been answered with a refreshed token, so it is retried only once. */
  retried?: boolean;
  /** The auth epoch the request started in; a change cancels it. */
  authEpoch?: number;
}
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  config: HttpRequestConfig;
}
/** The error body every API route sends: `{ success: false, error: { message } }`. */
export interface ApiErrorBody {
  success?: boolean;
  error?: { message?: string };
}

/** A failed request: `response` is set when the server answered with a non-2xx status. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly response?: { status: number; data: ApiErrorBody },
    readonly config?: HttpRequestConfig,
    readonly code?: 'ERR_NETWORK' | 'ECONNABORTED' | 'ERR_BAD_RESPONSE',
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
/** A request abandoned on purpose, for example because the signed-in account changed. */
export class CanceledError extends Error {
  constructor(message = 'canceled') {
    super(message);
    this.name = 'CanceledError';
  }
}
export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
/** The server's own message for a failed request, if it sent one. */
export const serverMessage = (error: unknown): string | undefined =>
  isHttpError(error) ? error.response?.data?.error?.message : undefined;
