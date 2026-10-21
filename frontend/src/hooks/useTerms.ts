import { createTerms, resolveTerminology, type Terms } from '@study-tracker/contracts';
import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useUserPreferencesStore } from '../store/userPreferencesStore';

/** Display words for course/topic/session, resolved by `resolveTerminology`. */
export const useTerms = (): Terms => {
  const terminologyPreset = useSettingsStore((state) => state.settings.terminologyPreset);
  const customTerminology = useSettingsStore((state) => state.settings.customTerminology);
  const userPreset = useUserPreferencesStore((state) => state.preferences.terminologyPreset);
  const userCustom = useUserPreferencesStore((state) => state.preferences.customTerminology);
  const vocabulary = resolveTerminology(
    { terminologyPreset: userPreset, customTerminology: userCustom },
    { terminologyPreset, customTerminology },
  );
  return useMemo(() => createTerms(vocabulary), [vocabulary]);
};
