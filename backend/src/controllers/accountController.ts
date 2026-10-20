import type { NextFunction, Request, Response } from 'express';
import { clearRefreshCookie } from '../middleware/authCookies';
import { deleteOwnAccount, exportAccount } from '../services/accounts';

export const downloadAccountData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await exportAccount(req.user!.id);
    res.setHeader('Content-Disposition', `attachment; filename="hesap-verisi-${data.exportedAt.slice(0, 10)}.json"`);
    res.json(data);
  } catch (error) { next(error); }
};

export const deleteMyAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteOwnAccount(req.user!.id, req.body.password);
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Hesabınız ve verileriniz silindi' });
  } catch (error) { next(error); }
};
