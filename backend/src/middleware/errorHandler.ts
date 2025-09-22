import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  console.error('❌ Error:', err);

  if (err.name === 'CastError') {
    const message = 'Geçersiz kaynak ID\'si';
    error = { name: 'CastError', message, statusCode: 400 } as CustomError;
  }

  if (err.name === 'ValidationError') {
    const message = 'Doğrulama hatası';
    error = { name: 'ValidationError', message, statusCode: 400 } as CustomError;
  }

  if ((err as any).code === 11000) {
    const message = 'Bu veri zaten mevcut';
    error = { name: 'DuplicateError', message, statusCode: 400 } as CustomError;
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Geçersiz token';
    error = { name: 'JsonWebTokenError', message, statusCode: 401 } as CustomError;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token süresi dolmuş';
    error = { name: 'TokenExpiredError', message, statusCode: 401 } as CustomError;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Sunucu hatası',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};