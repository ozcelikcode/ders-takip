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
        error: validationError(parsed.error.issues, 'invalidSettings'),
      });
    return;
  }
  try {
    await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        for (const [key, value] of Object.entries(parsed.data)) {
          // Objects and null (custom words, cleared optional values) round-trip as JSON.
          const type =
            typeof value === 'boolean'
              ? 'boolean'
              : typeof value === 'number'
                ? 'number'
                : typeof value === 'object'
                  ? 'json'
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
            { key, value: type === 'json' ? JSON.stringify(value) : String(value), type, category },
            { transaction },
          );
        }
      },
    );
    res.json({
      success: true,
      data: await readSiteSettings(),
    });
  } catch (error) {
    next(error);
  }
};
