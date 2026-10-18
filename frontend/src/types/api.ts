import type { ApiError } from '@study-tracker/contracts';
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}
