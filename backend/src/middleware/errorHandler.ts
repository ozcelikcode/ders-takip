import { type ErrorRequestHandler } from 'express';
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  let status = 500;
  let message = 'Sunucu hatası';

  if (error instanceof UniqueConstraintError) {
    status = 409;
    message = 'Bu veri zaten mevcut';
  } else if (error instanceof ValidationError) {
    status = 400;
    message = 'Doğrulama hatası';
  } else if (error instanceof ForeignKeyConstraintError) {
    status = 409;
    message = 'İlişkili kayıt nedeniyle işlem tamamlanamadı';
  } else if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    status = error.statusCode;
    message = error.message;
  }

  if (status >= 500) console.error('Request failed:', { name: error instanceof Error ? error.name : 'UnknownError', status });
  response.status(status).json({ success: false, error: { message } });
};
