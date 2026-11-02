import { defaultSiteSettings, siteSettingsSchema, withSiteIdentity, type SiteSettings } from '@study-tracker/contracts';
import type { Response } from 'express';
import { Settings } from '../models';

/** Reads persisted site settings, ignoring unknown keys and invalid stored values; the built-in identity follows the language. */
export const readSiteSettings = async (): Promise<SiteSettings> => {
  const result = { ...defaultSiteSettings };
  for (const setting of await Settings.findAll()) {
    if (!Object.prototype.hasOwnProperty.call(siteSettingsSchema.shape, setting.key)) continue;
    const key = setting.key as keyof SiteSettings;
    const parsed = siteSettingsSchema.shape[key].safeParse(setting.getTypedValue());
    if (parsed.success) Object.assign(result, { [key]: parsed.data });
  }
  return withSiteIdentity(result);
};

export const sendMaintenance = (res: Response): void => {
  res.setHeader('Retry-After', '300');
  res.status(503).json({ success: false, error: { code: 'siteMaintenance' } });
};
