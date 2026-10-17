export interface ValidationIssue {
  field: string;
  message: string;
}
export interface ApiError {
  message: string;
  details?: ValidationIssue[];
}
export function validationError(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  message = 'Doğrulama hatası',
): ApiError {
  return {
    message,
    details: issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
