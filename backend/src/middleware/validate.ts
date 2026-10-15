import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {

      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;

      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {

        res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            details: error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  };
};