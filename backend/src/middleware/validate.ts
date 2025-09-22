import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      console.log('Validation middleware called');
      console.log('req.body:', req.body);
      console.log('req.query:', req.query);
      console.log('req.params:', req.params);

      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;

      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;

      console.log('Validation successful');
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation failed with ZodError:', error.issues);
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

      console.log('Validation failed with unknown error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' },
      });
    }
  };
};