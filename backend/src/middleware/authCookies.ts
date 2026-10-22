import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { getEnvironment } from '../config/environment';

const cookieName = 'study_refresh';
const options = (): CookieOptions => ({ httpOnly: true, secure: getEnvironment().NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth' });
export const setRefreshCookie = (response: Response, credential: string, expires: Date) => response.cookie(cookieName, credential, { ...options(), expires });
export const clearRefreshCookie = (response: Response) => response.clearCookie(cookieName, options());
export const readRefreshCookie = (request: Request): string => {
  const cookies = (request.headers.cookie || '').split(';').map(value => value.trim());
  return cookies.find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
};

// Cookie-authenticated mutations require an explicit application request and trusted browser origin.
export const requireTrustedAuthRequest = (request: Request, response: Response, next: NextFunction): void => {
  const origin = request.get('origin');
  if (request.get('X-Requested-With') !== 'StudyTracker' || (origin && origin !== new URL(getEnvironment().FRONTEND_URL).origin) || request.get('sec-fetch-site') === 'cross-site') {
    response.status(403).json({ success: false, error: { code: 'originRejected' } });
    return;
  }
  response.setHeader('Cache-Control', 'no-store');
  next();
};
