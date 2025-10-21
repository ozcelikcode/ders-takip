import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsAPI } from '../services/api';

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  maxStudentsPerCourse: number;
  sessionTimeout: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  primaryColor: string;
  secondaryColor: string;
}

interface SettingsState {
  settings: SiteSettings;
  isLoading: boolean;
  lastFetched: number | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<SiteSettings>) => Promise<void>;
  applyTheme: () => void;
}

const defaultSettings: SiteSettings = {
  siteName: 'Görev Takip Sistemi',
  siteDescription: 'Herkes için modern görev takip ve zaman yönetimi platformu',
  siteUrl: 'http://localhost:3000',
  adminEmail: 'admin@test.com',
  allowRegistration: true,
  maintenanceMode: false,
  maxStudentsPerCourse: 50,
  sessionTimeout: 60,
  emailNotifications: true,
  pushNotifications: true,
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      lastFetched: null,

      fetchSettings: async () => {
        const now = Date.now();
        const lastFetched = get().lastFetched;

        // Cache for 5 minutes
        if (lastFetched && now - lastFetched < 5 * 60 * 1000) {
          return;
        }

        set({ isLoading: true });

        try {
          const response = await settingsAPI.getSettings();
          const settingsData = response.data.data || {};

          const settings: SiteSettings = {
            siteName: settingsData.siteName || defaultSettings.siteName,
            siteDescription: settingsData.siteDescription || defaultSettings.siteDescription,
            siteUrl: settingsData.siteUrl || defaultSettings.siteUrl,
            adminEmail: settingsData.adminEmail || defaultSettings.adminEmail,
            allowRegistration: settingsData.allowRegistration ?? defaultSettings.allowRegistration,
            maintenanceMode: settingsData.maintenanceMode ?? defaultSettings.maintenanceMode,
            maxStudentsPerCourse: settingsData.maxStudentsPerCourse || defaultSettings.maxStudentsPerCourse,
            sessionTimeout: settingsData.sessionTimeout || defaultSettings.sessionTimeout,
            emailNotifications: settingsData.emailNotifications ?? defaultSettings.emailNotifications,
            pushNotifications: settingsData.pushNotifications ?? defaultSettings.pushNotifications,
            primaryColor: settingsData.primaryColor || defaultSettings.primaryColor,
            secondaryColor: settingsData.secondaryColor || defaultSettings.secondaryColor,
          };

          set({
            settings,
            isLoading: false,
            lastFetched: now,
          });

          // Apply theme
          get().applyTheme();
        } catch (error) {
          console.error('Failed to fetch settings:', error);
          set({ isLoading: false });
        }
      },

      updateSettings: async (data: Partial<SiteSettings>) => {
        set({ isLoading: true });

        try {
          const response = await settingsAPI.updateSettings(data);
          const settingsData = response.data.data || {};

          const settings: SiteSettings = {
            siteName: settingsData.siteName || defaultSettings.siteName,
            siteDescription: settingsData.siteDescription || defaultSettings.siteDescription,
            siteUrl: settingsData.siteUrl || defaultSettings.siteUrl,
            adminEmail: settingsData.adminEmail || defaultSettings.adminEmail,
            allowRegistration: settingsData.allowRegistration ?? defaultSettings.allowRegistration,
            maintenanceMode: settingsData.maintenanceMode ?? defaultSettings.maintenanceMode,
            maxStudentsPerCourse: settingsData.maxStudentsPerCourse || defaultSettings.maxStudentsPerCourse,
            sessionTimeout: settingsData.sessionTimeout || defaultSettings.sessionTimeout,
            emailNotifications: settingsData.emailNotifications ?? defaultSettings.emailNotifications,
            pushNotifications: settingsData.pushNotifications ?? defaultSettings.pushNotifications,
            primaryColor: settingsData.primaryColor || defaultSettings.primaryColor,
            secondaryColor: settingsData.secondaryColor || defaultSettings.secondaryColor,
          };

          set({
            settings,
            isLoading: false,
            lastFetched: Date.now(),
          });

          // Apply theme
          get().applyTheme();
        } catch (error) {
          console.error('Failed to update settings:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      applyTheme: () => {
        const { settings } = get();
        const root = document.documentElement;

        // Apply primary color
        if (settings.primaryColor) {
          // Convert hex to RGB for Tailwind CSS variables
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
              ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
                }
              : null;
          };

          const primaryRgb = hexToRgb(settings.primaryColor);
          if (primaryRgb) {
            root.style.setProperty('--color-primary', `${primaryRgb.r} ${primaryRgb.g} ${primaryRgb.b}`);
          }
        }

        // Apply secondary color
        if (settings.secondaryColor) {
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
              ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
                }
              : null;
          };

          const secondaryRgb = hexToRgb(settings.secondaryColor);
          if (secondaryRgb) {
            root.style.setProperty('--color-secondary', `${secondaryRgb.r} ${secondaryRgb.g} ${secondaryRgb.b}`);
          }
        }

        // Update document title
        if (settings.siteName) {
          document.title = settings.siteName;
        }

        // Update meta description
        if (settings.siteDescription) {
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', settings.siteDescription);
          }
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        settings: state.settings,
        lastFetched: state.lastFetched,
      }),
    }
  )
);