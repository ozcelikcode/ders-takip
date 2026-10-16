import { create } from 'zustand';
import { defaultSiteSettings, publicSettingsSchema, siteSettingsSchema, settingsPatchSchema, type PublicSettings, type SiteSettings } from '@study-tracker/contracts';
import { settingsAPI } from '../services/api';
export type { SiteSettings } from '@study-tracker/contracts';

interface SettingsState {
  settings: PublicSettings;
  adminSettings: SiteSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  fetchAdminSettings: () => Promise<void>;
  clearAdminSettings: () => void;
  updateSettings: (data: Partial<SiteSettings>) => Promise<void>;
}
localStorage.removeItem('settings-storage');
const initial = () => {
  try { return publicSettingsSchema.parse(JSON.parse(localStorage.getItem('site-branding') || 'null')); }
  catch { return publicSettingsSchema.parse(defaultSiteSettings); }
};
let adminGeneration = 0;
let publicRevision = 0;
const storePublic = (settings: PublicSettings) => { try { localStorage.setItem('site-branding', JSON.stringify(settings)); } catch { /* Storage is optional. */ } };
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: initial(), adminSettings: null, isLoading: false, error: null,
  fetchSettings: async () => {
    const revision = ++publicRevision;
    try {
      const response = await settingsAPI.getSettings();
      const settings = publicSettingsSchema.parse(response.data.data);
      if (revision !== publicRevision) return;
      storePublic(settings); set({ settings });
    } catch { set({ error: 'Site bilgileri yenilenemedi' }); }
  },
  fetchAdminSettings: async () => {
    const generation = adminGeneration;
    set({ isLoading: true, error: null });
    try {
      const response = await settingsAPI.getAdminSettings();
      const adminSettings = siteSettingsSchema.parse(response.data.data);
      if (generation !== adminGeneration) return;
      const settings = publicSettingsSchema.parse(adminSettings);
      publicRevision++;
      storePublic(settings); set({ adminSettings, settings, isLoading: false });
    } catch { if (generation === adminGeneration) set({ isLoading: false, error: 'Yönetim ayarları yüklenemedi' }); }
  },
  clearAdminSettings: () => { adminGeneration++; set({ adminSettings: null, isLoading: false, error: null }); },
  updateSettings: async data => {
    const parsed = settingsPatchSchema.parse(data);
    const generation = adminGeneration;
    set({ isLoading: true, error: null });
    try {
      const response = await settingsAPI.updateSettings(parsed);
      if (generation !== adminGeneration) return;
      const adminSettings = siteSettingsSchema.parse(response.data.data);
      const settings = publicSettingsSchema.parse(adminSettings);
      publicRevision++;
      storePublic(settings); set({ adminSettings, settings, isLoading: false });
    } catch (error) { if (generation === adminGeneration) set({ isLoading: false, error: 'Ayarlar kaydedilemedi' }); throw error; }
  },
}));
