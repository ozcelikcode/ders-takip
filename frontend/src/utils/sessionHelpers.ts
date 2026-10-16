import { parseISO } from 'date-fns';
import { canTransitionSession } from '@study-tracker/contracts';
import { StudySession } from '../types/planner';

/**
 * Oturumun vakti geçmiş mi kontrol eder
 */
export const isSessionOverdue = (session: StudySession): boolean => {
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

/**
 * Oturum için text dekorasyon stil class'ını döndürür
 */
export const getSessionTextStyle = (session: StudySession): string => {
  // Tamamlanan görevler - yeşil line-through
  if (session.status === 'completed') {
    return 'line-through decoration-2 decoration-green-500/50';
  }

  // Kaçırılan görevler - kırmızı line-through
  if (isSessionMissed(session)) {
    return 'line-through decoration-2 decoration-red-500/50';
  }

  return '';
};

export const getRecentSessions = <T extends { endTime: string; completedAt?: string | null }>(sessions: readonly T[], limit = 5): T[] => (
  [...sessions]
    .sort((first, second) => new Date(second.completedAt || second.endTime).getTime() - new Date(first.completedAt || first.endTime).getTime())
    .slice(0, limit)
);

export const formatMeasuredTime = (seconds: number): string => {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value} sn`;
  if (value < 3600) return `${Math.floor(value / 60)} dk ${value % 60} sn`;
  return `${Math.floor(value / 3600)} sa ${Math.floor(value % 3600 / 60)} dk`;
};
export const measuredSessionLabel = (session: Pick<StudySession, 'trackingCoverage' | 'studySeconds'>) => session.trackingCoverage === undefined || session.trackingCoverage === 'untracked' ? 'Süre ölçülmedi' : `${formatMeasuredTime(session.studySeconds ?? 0)} çalışma${session.trackingCoverage === 'partial' ? ' (kısmi)' : ''}`;
