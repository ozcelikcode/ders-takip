import { createTerms, resolveTerminologyPreset, type Terms } from '@study-tracker/contracts';
import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useUserPreferencesStore } from '../store/userPreferencesStore';

/** Display words for course/topic/session: the user's own preset, else the site preset. */
export const useTerms = (): Terms => {
  const sitePreset = useSettingsStore((state) => state.settings.terminologyPreset);
  const userPreset = useUserPreferencesStore((state) => state.preferences.terminologyPreset);
  const preset = resolveTerminologyPreset({ terminologyPreset: userPreset ?? null }, sitePreset);
  return useMemo(() => createTerms(preset), [preset]);
};
