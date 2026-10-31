import { create } from 'zustand';
import {
  defaultSiteSettings,
  publicSettingsSchema,
  siteSettingsSchema,
  settingsPatchSchema,
  type PublicSettings,
  type SiteSettings,
  type SettingsPatch,
} from '@study-tracker/contracts';
import { settingsAPI } from '../services/api';
import { useLanguageStore } from './languageStore';

interface SettingsState {
  settings: PublicSettings;
  adminSettings: SiteSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  fetchAdminSettings: () => Promise<void>;
  clearAdminSettings: () => void;
  updateSettings: (data: SettingsPatch) => Promise<void>;
}
const initial = () => {
  try {
    // Defaults first so a cache written before a field existed still loads.
    return publicSettingsSchema.parse({
      ...defaultSiteSettings,
      ...JSON.parse(localStorage.getItem('site-branding') || 'null'),
    });
  } catch {
    return publicSettingsSchema.parse(defaultSiteSettings);
  }
};
let adminGeneration = 0;
let publicRevision = 0;
let adminReadRevision = 0;
let adminWriteRevision = 0;
const storePublic = (settings: PublicSettings) => {
  try {
    localStorage.setItem('site-branding', JSON.stringify(settings));
  } catch {
    /* Storage is optional. */
  }
};
export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: initial(),
  adminSettings: null,
  isLoading: false,
  error: null,
  fetchSettings: async () => {
    const revision = ++publicRevision;
    try {
      const response = await settingsAPI.getSettings();
      const settings = publicSettingsSchema.parse(response.data.data);
      if (revision !== publicRevision) return;
      storePublic(settings);
      set({ settings });
    } catch {
      /* Public refresh errors must not replace private settings errors. */
    }
  },
  fetchAdminSettings: async () => {
    const generation = adminGeneration;
    const readRevision = ++adminReadRevision;
    const writeRevision = adminWriteRevision;
    set({ isLoading: true, error: null });
    try {
      const response = await settingsAPI.getAdminSettings();
      const adminSettings = siteSettingsSchema.parse(response.data.data);
      if (
        generation !== adminGeneration ||
        readRevision !== adminReadRevision ||
        writeRevision !== adminWriteRevision
      )
        return;
      const settings = publicSettingsSchema.parse(adminSettings);
      publicRevision++;
      storePublic(settings);
      set({ adminSettings, settings, isLoading: false });
    } catch {
      if (
        generation === adminGeneration &&
        readRevision === adminReadRevision &&
        writeRevision === adminWriteRevision
      )
        set({ isLoading: false, error: useLanguageStore.getState().text.errors.adminSettingsLoadFailed });
    }
  },
  clearAdminSettings: () => {
    adminGeneration++;
    set({ adminSettings: null, isLoading: false, error: null });
  },
  updateSettings: async (data) => {
    const parsed = settingsPatchSchema.parse(data);
    adminWriteRevision++;
    adminReadRevision++;
    const generation = adminGeneration;
    set({ isLoading: true, error: null });
    try {
      const response = await settingsAPI.updateSettings(parsed);
      if (generation !== adminGeneration) return;
      adminWriteRevision++;
      adminReadRevision++;
      const adminSettings = siteSettingsSchema.parse(response.data.data);
      const settings = publicSettingsSchema.parse(adminSettings);
      publicRevision++;
      storePublic(settings);
      set({ adminSettings, settings, isLoading: false });
    } catch (error) {
      if (generation === adminGeneration) {
        adminWriteRevision++;
        adminReadRevision++;
        set({ isLoading: false });
      }
      throw error;
    }
  },
}));
