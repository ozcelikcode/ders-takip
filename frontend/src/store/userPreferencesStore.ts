import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'tr' | 'en';

export interface UserPreferences {
  // Görünüm
  theme: ThemeMode;
  customPrimaryColor?: string;

  // Bildirimler
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;

  // Çalışma Tercihleri
  defaultPomodoroDuration: number; // dakika
  defaultShortBreak: number; // dakika
  defaultLongBreak: number; // dakika
  pomodorosUntilLongBreak: number;
  weeklyStudyGoal: number; // saat
  dailyStudyGoal: number; // saat
  activeStudyDays: number[]; // [0-6] (0=Pazartesi, 6=Pazar veya 0=Pazar, 6=Cumartesi - fns/tr'ye göre 1=Pazartesi)

  // Diğer
  language: Language;
  timezone: string;
}

interface UserPreferencesState {
  preferences: UserPreferences;

  // Actions
  updatePreferences: (data: Partial<UserPreferences>, syncToServer?: boolean) => void;
  resetPreferences: () => void;
  applyTheme: () => void;
  syncWithServer: (backendPrefs: any) => void;
}

const defaultPreferences: UserPreferences = {
  // Görünüm
  theme: 'system',

  // Bildirimler
  emailNotifications: true,
  pushNotifications: true,
  taskReminders: true,

  // Çalışma Tercihleri
  defaultPomodoroDuration: 25,
  defaultShortBreak: 5,
  defaultLongBreak: 15,
  pomodorosUntilLongBreak: 4,
  weeklyStudyGoal: 20,
  dailyStudyGoal: 4,
  activeStudyDays: [1, 2, 3, 4, 5, 6, 0], // Pazartesi-Pazar

  // Diğer
  language: 'tr',
  timezone: 'Europe/Istanbul',
};

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,

      updatePreferences: (data: Partial<UserPreferences>, syncToServer = true) => {
        const oldPrefs = get().preferences;
        const newPrefs = {
          ...oldPrefs,
          ...data,
        };

        set({ preferences: newPrefs });

        // Apply theme if theme-related changes
        if (data.theme !== undefined || data.customPrimaryColor !== undefined) {
          get().applyTheme();
        }

        if (syncToServer) {
          // We don't await this to keep UI snappy, but it will update the backend
          authAPI.updateProfile({ preferences: newPrefs }).catch((err: any) => {
            console.error('Failed to sync preferences to server:', err);
          });
        }
      },

      syncWithServer: (backendPrefs: any) => {
        if (!backendPrefs) return;

        // Merge backend preferences with local ones, giving priority to backend
        // but only if they differ to avoid unnecessary re-renders
        const currentPrefs = get().preferences;

        const mergedPrefs: UserPreferences = {
          ...currentPrefs,
          ...backendPrefs,
        };

        set({ preferences: mergedPrefs });
        get().applyTheme();
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences });
        get().applyTheme();
        authAPI.updateProfile({ preferences: defaultPreferences }).catch(console.error);
      },

      applyTheme: () => {
        const { preferences } = get();
        const root = document.documentElement;

        // Apply theme mode
        let effectiveTheme: 'light' | 'dark' = 'light';

        if (preferences.theme === 'system') {
          effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          effectiveTheme = preferences.theme;
        }

        if (effectiveTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Apply custom primary color if set
        if (preferences.customPrimaryColor) {
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

          const primaryRgb = hexToRgb(preferences.customPrimaryColor);
          if (primaryRgb) {
            root.style.setProperty('--color-primary', `${primaryRgb.r} ${primaryRgb.g} ${primaryRgb.b}`);
          }
        }
      },
    }),
    {
      name: 'user-preferences-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme();
        }
      },
    }
  )
);
