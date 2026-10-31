import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { fail, type ConfirmedOperation } from '@study-tracker/contracts';
import { productionLimit } from './rateLimits';
import { User } from '../models';
import { recordAdminEvent } from '../services/adminAudit';

// Only wrong passwords count, so a stolen session cannot keep guessing the administrator's password.
const guessLimit = productionLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, code: 'tooManyAttempts' });

/**
 * Asks for the signed-in administrator's password again before `operation` (when `applies` says it is one), so an
 * unattended or stolen session alone cannot do it. A wrong password is logged. The password never reaches the handler.
 */
export const confirmAdminPassword = (operation: ConfirmedOperation, applies: (req: Request) => boolean | Promise<boolean> = () => true): RequestHandler[] => [
  ...guessLimit,
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as { adminPassword?: unknown };
      const password = body.adminPassword;
      delete body.adminPassword;
      if (!(await applies(req))) return next();
      const actor = await User.findByPk(req.user!.id, { attributes: { include: ['password'] } });
      if (!actor || typeof password !== 'string' || !(await actor.comparePassword(password))) {
        await recordAdminEvent({ action: 'confirmationFailed', actor: req.user!, details: { operation }, request: req });
        fail(400, 'wrongPassword');
      }
      next();
    } catch (error) {
      next(error);
    }
  },
];
