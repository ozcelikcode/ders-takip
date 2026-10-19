import type { NextFunction, Request, Response } from 'express';
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
    res.json({ success: true, message: 'Şifre güncellendi. Yeni şifrenizle giriş yapın' });
  } catch (error) {
    next(error);
  }
};

export const issuePasswordResetLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: await createAdminResetLink(Number(req.params.id)) });
  } catch (error) {
    next(error);
  }
};
