import type { NextFunction, Request, Response } from 'express';
import { User } from '../models';
import { recordAdminEvent } from '../services/adminAudit';
import { createAdminResetLink, requestPasswordReset, resetPassword } from '../services/passwordReset';

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: { delivery: await requestPasswordReset(req.body.email) } });
  } catch (error) {
    next(error);
  }
};

export const completePasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await resetPassword(req.body.token, req.body.password);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const issuePasswordResetLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const link = await createAdminResetLink(Number(req.params.id));
    const target = await User.findByPk(Number(req.params.id));
    await recordAdminEvent({ action: 'resetLinkIssued', actor: req.user!, target, request: req });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
};
