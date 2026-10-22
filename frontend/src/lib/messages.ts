import { isApiErrorCode, validationCode, type ApiError } from '@study-tracker/contracts';
import { isHttpError } from '../services/httpError';
import { useLanguageStore } from '../store/languageStore';

const text = () => useLanguageStore.getState().text;

/** A schema issue (its message is a validation code) in the interface language. */
export const issueMessage = (message: string): string => text().validation[validationCode(message)];

/** The server's reason for a failed request, worded in the interface language; undefined when it sent none. */
export const serverMessage = (error: unknown): string | undefined => {
  if (!isHttpError(error)) return undefined;
  const body: Partial<ApiError> | undefined = error.response?.data?.error;
  if (!body || !isApiErrorCode(body.code)) return undefined;
  // A form-level rejection names its first field problem; that is the actionable part.
  const field = body.details?.[0];
  if ((body.code === 'validation' || body.code === 'invalidSettings') && field) return issueMessage(field.code);
  return text().apiErrors[body.code];
};
