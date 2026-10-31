import type { Request, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { getEnvironment } from '../config/environment';

type LimitOptions = {
  windowMs: number;
  limit: number;
  code: 'tooManyRequests' | 'tooManyAttempts';
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
};

/** A rate limit that applies only in production, so tests and local development are never throttled. */
export const productionLimit = ({ code, ...options }: LimitOptions): RequestHandler[] =>
  getEnvironment().NODE_ENV === 'production'
    ? [rateLimit({ ...options, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, error: { code } } })]
    : [];
