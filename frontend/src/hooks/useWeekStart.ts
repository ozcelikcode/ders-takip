import { resolveWeekStart } from '@study-tracker/contracts';
import { useUserPreferencesStore } from '../store/userPreferencesStore';

export const useWeekStart = () =>
  useUserPreferencesStore((state) => resolveWeekStart(state.preferences));
