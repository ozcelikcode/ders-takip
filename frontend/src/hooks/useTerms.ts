import { createTerms, type Terms } from '@study-tracker/contracts';
import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Display words for course/topic/session chosen by the admin's terminology preset. */
export const useTerms = (): Terms => {
  const preset = useSettingsStore((state) => state.settings.terminologyPreset);
  return useMemo(() => createTerms(preset), [preset]);
};
