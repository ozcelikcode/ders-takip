import { toNestErrors } from '@hookform/resolvers';
import type { FieldError, FieldValues, Resolver } from 'react-hook-form';

interface FormContract<T> {
  safeParse(
    value: unknown,
  ):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: { path: PropertyKey[]; message: string }[] };
      };
}
// Structural typing keeps the form adapter independent of Zod major versions.
export function contractResolver<T extends FieldValues>(
  schema: FormContract<T>,
): Resolver<T> {
  return (values, _context, options) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, FieldError> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      if (!errors[path])
        errors[path] = { type: 'validate', message: issue.message };
    }
    return { values: {}, errors: toNestErrors(errors, options) };
  };
}
