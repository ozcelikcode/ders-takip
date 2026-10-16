import type { NextFunction, Request, Response } from 'express';
import { Transaction } from 'sequelize';
import { defaultSiteSettings, publicSettingsSchema, settingsPatchSchema, siteSettingsSchema, type SiteSettings } from '@study-tracker/contracts';
import { Settings } from '../models';
import { sequelize } from '../config/database';

const readSettings = async (): Promise<SiteSettings> => {
  const result = { ...defaultSiteSettings };
  for (const setting of await Settings.findAll()) {
    if (!Object.prototype.hasOwnProperty.call(siteSettingsSchema.shape, setting.key)) continue;
    const key = setting.key as keyof SiteSettings;
    const parsed = siteSettingsSchema.shape[key].safeParse(setting.getTypedValue());
    if (parsed.success) Object.assign(result, { [key]: parsed.data });
  }
  return result;
};
export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: publicSettingsSchema.parse(await readSettings()) }); } catch (error) { next(error); }
};
export const getAdminSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json({ success: true, data: await readSettings() }); } catch (error) { next(error); }
};
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  const parsed = settingsPatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: { message: 'Ayarlar geçersiz', details: parsed.error.flatten() } }); return; }
  try {
    await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      for (const [key, value] of Object.entries(parsed.data)) {
        const type = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';
        const category = key === 'backup_interval' ? 'backup' : key.includes('Color') || key === 'siteLogo' || key === 'siteIcon' ? 'appearance' : key.endsWith('Notifications') ? 'notifications' : ['maintenanceMode', 'allowRegistration', 'sessionTimeout'].includes(key) ? 'security' : 'general';
        await Settings.upsert({ key, value: value === null ? '' : String(value), type, category }, { transaction });
      }
    });
    res.json({ success: true, message: 'Ayarlar güncellendi', data: await readSettings() });
  } catch (error) { next(error); }
};
