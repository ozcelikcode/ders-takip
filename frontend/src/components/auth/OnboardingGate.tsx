import { needsOnboarding } from '@study-tracker/contracts';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';

/** Sends accounts that have not finished (or skipped) onboarding to the welcome wizard. */
export default function OnboardingGate({ children }: { children: ReactNode }) {
  const pending = useUserPreferencesStore((state) => needsOnboarding(state.preferences));
  return pending ? <Navigate to="/welcome" replace /> : <>{children}</>;
}
