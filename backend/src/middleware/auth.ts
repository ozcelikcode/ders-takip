import { JsonWebTokenError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { AuthSession } from '../models/AuthSession';
import { verifyAccessToken } from '../utils/jwt';
import { readSiteSettings, sendMaintenance } from '../services/siteSettings';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'loginRequired' },
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    const session = await AuthSession.findByPk(decoded.sid);
    if (!session || String(session.userId) !== decoded.id || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      res.status(401).json({ success: false, error: { code: 'sessionExpired' } });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'invalidToken' },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: 'accountInactive' },
      });
      return;
    }

    if (user.role !== 'admin' && (await readSiteSettings()).maintenanceMode) { sendMaintenance(res); return; }

    req.user = user;
    next();
  } catch (error) {
    if (!(error instanceof JsonWebTokenError) && !(error instanceof ZodError)) { next(error); return; }
    res.status(401).json({
      success: false,
      error: { code: 'invalidToken' },
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'loginRequired' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'forbidden' },
      });
      return;
    }

    next();
  };
};