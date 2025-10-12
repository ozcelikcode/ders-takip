import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // Diğer
  language: Language;
  timezone: string;
}

interface UserPreferencesState {
  preferences: UserPreferences;

  // Actions
  updatePreferences: (data: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  applyTheme: () => void;
}

const defaultPreferences: UserPreferences = {
  // Görünüm
  theme: 'system',
  customPrimaryColor: undefined,

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

  // Diğer
  language: 'tr',
  timezone: 'Europe/Istanbul',
};

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,

      updatePreferences: (data: Partial<UserPreferences>) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...data,
          },
        }));

        // Apply theme if theme-related changes
        if (data.theme !== undefined || data.customPrimaryColor !== undefined) {
          get().applyTheme();
        }
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences });
        get().applyTheme();
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
    }
  )
);
