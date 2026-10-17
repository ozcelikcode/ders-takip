import type { NextFunction, Request, Response } from 'express';
import { Transaction } from 'sequelize';
import {
  publicSettingsSchema,
  settingsPatchSchema,
  validationError,
} from '@study-tracker/contracts';
import { Settings } from '../models';
import { readSiteSettings } from '../services/siteSettings';
import { sequelize } from '../config/database';

export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json({
      success: true,
      data: publicSettingsSchema.parse(await readSiteSettings()),
    });
  } catch (error) {
    next(error);
  }
};
export const getAdminSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: await readSiteSettings() });
  } catch (error) {
    next(error);
  }
};
export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const parsed = settingsPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({
        success: false,
        error: validationError(parsed.error.issues, 'Ayarlar geçersiz'),
      });
    return;
  }
  try {
    await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        for (const [key, value] of Object.entries(parsed.data)) {
          const type =
            typeof value === 'boolean'
              ? 'boolean'
              : typeof value === 'number'
                ? 'number'
                : 'string';
          const category =
            key === 'backup_interval'
              ? 'backup'
              : key.includes('Color') ||
                  key === 'siteLogo' ||
                  key === 'siteIcon'
                ? 'appearance'
                : key.endsWith('Notifications')
                  ? 'notifications'
                  : [
                        'maintenanceMode',
                        'allowRegistration',
                        'sessionTimeout',
                      ].includes(key)
                    ? 'security'
                    : 'general';
          await Settings.upsert(
            { key, value: value === null ? '' : String(value), type, category },
            { transaction },
          );
        }
      },
    );
    res.json({
      success: true,
      message: 'Ayarlar güncellendi',
      data: await readSiteSettings(),
    });
  } catch (error) {
    next(error);
  }
};
