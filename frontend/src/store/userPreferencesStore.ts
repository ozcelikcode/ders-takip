import { create } from 'zustand';
import { defaultPreferences, preferencesSchema, preferencesPatchSchema, type PreferencesPatch, type UserPreferences } from '@study-tracker/contracts';
import { authAPI } from '../services/api';
import { archiveUnscopedState } from '../lib/archiveUnscopedState';
export type { ThemeMode } from '@study-tracker/contracts';

interface PreferencesState {
  userId: string | null;
  preferences: UserPreferences;
  pending: number;
  revision: number;
  error: string | null;
  bindUser: (id: string | null, preferences?: unknown) => void;
  updatePreferences: (patch: PreferencesPatch) => Promise<void>;
  resetPreferences: () => Promise<void>;
}
let generation = 0;
let queue: Promise<void> = Promise.resolve();
// Unscoped legacy storage cannot be assigned to a known account safely.
archiveUnscopedState();
export const useUserPreferencesStore = create<PreferencesState>()((set, get) => ({
  userId: null, preferences: { ...defaultPreferences }, pending: 0, revision: 0, error: null,
  bindUser: (id, stored) => {
    generation++;
    queue = Promise.resolve();
    const parsed = preferencesSchema.safeParse(stored);
    set({ revision: get().revision + 1, userId: id === null ? null : String(id), preferences: id && parsed.success ? parsed.data : { ...defaultPreferences }, pending: 0, error: id && !parsed.success ? 'Tercihler yüklenemedi' : null });
  },
  updatePreferences: patch => {
    const parsed = preferencesPatchSchema.safeParse(patch);
    if (!parsed.success || !get().userId) {
      set({ error: 'Tercihler geçersiz veya oturum kapalı' });
      return Promise.reject(new Error('Preferences require a valid account and payload'));
    }
    const operationGeneration = generation;
    set({ pending: get().pending + 1, error: null });
    const operation = queue.catch(() => undefined).then(async () => {
      if (operationGeneration !== generation) throw new Error('Preference update superseded');
      const response = await authAPI.updateProfile({ preferences: parsed.data });
      if (operationGeneration !== generation) throw new Error('Account changed while saving preferences');
      const preferences = preferencesSchema.parse(response.data.data?.user.preferences);
      set({ preferences, revision: get().revision + 1, error: null });
    }).catch(error => {
      if (operationGeneration === generation) set({ error: 'Tercihler kaydedilemedi. Lütfen tekrar deneyin.' });
      throw error;
    }).finally(() => {
      if (operationGeneration === generation) set({ pending: get().pending - 1 });
    });
    queue = operation;
    return operation;
  },
  resetPreferences: () => {
    return get().updatePreferences({ ...defaultPreferences });
  },
}));
