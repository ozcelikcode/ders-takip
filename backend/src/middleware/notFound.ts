import { NextFunction, Request, Response } from 'express';

export const notFound = (req: Request, res: Response, _next: NextFunction) => {
  const error = new Error(`Endpoint bulunamadı: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      path: req.originalUrl,
      method: req.method,
    },
  });
};