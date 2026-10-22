import { create } from 'zustand';
import { defaultPreferences, mergePreferences, preferencesSchema, preferencesPatchSchema, type PreferencesPatch, type UserPreferences } from '@study-tracker/contracts';
import { authAPI } from '../services/api';
import { archiveUnscopedState } from '../lib/archiveUnscopedState';
import { useLanguageStore } from './languageStore';
export type { ThemeMode } from '@study-tracker/contracts';

interface PreferencesState {
  userId: string | null;
  /** The confirmed server value with every unsaved change applied on top, so choices show at once. */
  preferences: UserPreferences;
  pending: number;
  revision: number;
  error: string | null;
  bindUser: (id: string | null, preferences?: unknown) => void;
  updatePreferences: (patch: PreferencesPatch) => Promise<void>;
  resetPreferences: () => Promise<void>;
}
interface PendingChange {
  id: number;
  patch: PreferencesPatch;
}
let generation = 0;
let queue: Promise<void> = Promise.resolve();
// The last value the server acknowledged and the changes still on their way, in send order.
let confirmed: UserPreferences = { ...defaultPreferences };
let unsaved: PendingChange[] = [];
let nextChangeId = 0;
const optimisticView = () => unsaved.reduce((preferences, change) => mergePreferences(preferences, change.patch), confirmed);
// Unscoped legacy storage cannot be assigned to a known account safely.
archiveUnscopedState();
export const useUserPreferencesStore = create<PreferencesState>()((set, get) => ({
  userId: null, preferences: { ...defaultPreferences }, pending: 0, revision: 0, error: null,
  bindUser: (id, stored) => {
    generation++;
    queue = Promise.resolve();
    unsaved = [];
    const parsed = preferencesSchema.safeParse(stored);
    confirmed = id && parsed.success ? parsed.data : { ...defaultPreferences };
    set({ revision: get().revision + 1, userId: id === null ? null : String(id), preferences: confirmed, pending: 0, error: id && !parsed.success ? useLanguageStore.getState().text.errors.preferencesLoadFailed : null });
  },
  updatePreferences: patch => {
    const parsed = preferencesPatchSchema.safeParse(patch);
    if (!parsed.success || !get().userId) {
      set({ error: useLanguageStore.getState().text.errors.preferencesInvalid });
      return Promise.reject(new Error('Preferences require a valid account and payload'));
    }
    const operationGeneration = generation;
    const change = { id: nextChangeId++, patch: parsed.data };
    unsaved = [...unsaved, change];
    set({ preferences: optimisticView(), pending: get().pending + 1, error: null });
    const settle = (server?: UserPreferences) => {
      unsaved = unsaved.filter(({ id }) => id !== change.id);
      if (server) confirmed = server;
      set({ preferences: optimisticView(), revision: get().revision + 1 });
    };
    const operation = queue.catch(() => undefined).then(async () => {
      if (operationGeneration !== generation) throw new Error('Preference update superseded');
      const response = await authAPI.updateProfile({ preferences: parsed.data });
      if (operationGeneration !== generation) throw new Error('Account changed while saving preferences');
      settle(preferencesSchema.parse(response.data.data?.user.preferences));
      set({ error: null });
    }).catch(error => {
      // Only this change is undone; later ones stay on screen until their own answer arrives.
      if (operationGeneration === generation) {
        settle();
        set({ error: useLanguageStore.getState().text.errors.preferencesSaveFailed });
      }
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
