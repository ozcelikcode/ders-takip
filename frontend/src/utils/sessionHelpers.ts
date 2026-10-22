import { parseISO } from 'date-fns';
import { canTransitionSession } from '@study-tracker/contracts';
import { StudySession } from '../types/planner';
import { formatMeasuredSeconds, type Language } from '@study-tracker/contracts';
import type { Text } from '../i18n';

/**
 * Oturumun vakti geçmiş mi kontrol eder
 */
const isSessionOverdue = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);
  return sessionEnd < now;
};

/**
 * Oturum kaçırılmış mı (tamamlanmamış ve vakti geçmiş)
 */
export const isSessionMissed = (session: StudySession): boolean => {
  return (
    isSessionOverdue(session) &&
    session.status !== 'completed' &&
    session.status !== 'cancelled'
  );
};

/**
 * Oturum başlatılabilir mi kontrol eder
 */
export const canStartSession = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);

  // Vakti geçmişse başlatılamaz
  if (sessionEnd < now) {
    return false;
  }

  return session.status !== 'in_progress' && canTransitionSession(session.status, 'in_progress');
};

export const getRecentSessions = <T extends { endTime: string; completedAt?: string | null }>(sessions: readonly T[], limit = 5): T[] => (
  [...sessions]
    .sort((first, second) => new Date(second.completedAt || second.endTime).getTime() - new Date(first.completedAt || first.endTime).getTime())
    .slice(0, limit)
);

/** "5 dk 0 sn çalışma (kısmi)" or "Süre ölçülmedi", in the interface language. */
export const measuredSessionLabel = (
  session: Pick<StudySession, 'trackingCoverage' | 'studySeconds'>,
  text: Text['session'],
  language: Language,
) =>
  session.trackingCoverage === undefined || session.trackingCoverage === 'untracked'
    ? text.untracked
    : text.studied(formatMeasuredSeconds(session.studySeconds ?? 0, language), session.trackingCoverage === 'partial');
