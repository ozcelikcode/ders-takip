import { validationError } from '@study-tracker/contracts';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

interface ValidatedRequest {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Request['params'];
}
export const validate = (schema: z.ZodType<ValidatedRequest>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: validationError(result.error.issues),
      });
      return;
    }
    // Unspecified sections remain intact; controllers consume normalized values.
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined)
      req.query = result.data.query as Request['query'];
    if (result.data.params !== undefined) req.params = result.data.params;
    next();
  };
};
