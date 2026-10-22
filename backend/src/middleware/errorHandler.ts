import { type ErrorRequestHandler } from 'express';
import { ApiFailure, CalendarTimeError, type ApiError } from '@study-tracker/contracts';
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  let status = 500;
  let body: ApiError = { code: 'serverError' };

  if (error instanceof ApiFailure) {
    status = error.statusCode;
    body = error.params ? { code: error.code, params: error.params } : { code: error.code };
  } else if (error instanceof CalendarTimeError) {
    status = 400;
    body = { code: 'invalidDateOrZone' };
  } else if (error instanceof UniqueConstraintError) {
    status = 409;
    body = { code: 'duplicate' };
  } else if (error instanceof ValidationError) {
    status = 400;
    body = { code: 'validation' };
  } else if (error instanceof ForeignKeyConstraintError) {
    status = 409;
    body = { code: 'relatedRecord' };
  } else if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    // Framework errors (a malformed or oversized body) keep their status; their English text stays in the logs.
    status = error.statusCode;
    body = { code: 'requestFailed' };
  }

  if (status >= 500) console.error('Request failed:', { name: error instanceof Error ? error.name : 'UnknownError', status });
  response.status(status).json({ success: false, error: body });
};
