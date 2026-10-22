import type { ApiError } from '@study-tracker/contracts';
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
