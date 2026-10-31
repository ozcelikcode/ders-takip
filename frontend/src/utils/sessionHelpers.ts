import { parseISO } from 'date-fns';
import { canTransitionSession } from '@study-tracker/contracts';
import { StudySession } from '../types/planner';
import { formatMeasuredSeconds, type Language } from '@study-tracker/contracts';
import type { Text } from '../i18n';

/** Whether the session's planned end is already past. */
const isSessionOverdue = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);
  return sessionEnd < now;
};

/** Whether the session was missed: not finished and its planned end is past. */
export const isSessionMissed = (session: StudySession): boolean => {
  return (
    isSessionOverdue(session) &&
    session.status !== 'completed' &&
    session.status !== 'cancelled'
  );
};

/** Whether the session can be started now. */
export const canStartSession = (session: StudySession): boolean => {
  const now = new Date();
  const sessionEnd = parseISO(session.endTime);

  // A session whose planned end has passed cannot start.
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

/** Measured study with a partial marker, or that it was not measured, in the interface language. */
export const measuredSessionLabel = (
  session: Pick<StudySession, 'trackingCoverage' | 'studySeconds'>,
  text: Text['session'],
  language: Language,
) =>
  session.trackingCoverage === undefined || session.trackingCoverage === 'untracked'
    ? text.untracked
    : session.trackingCoverage === 'manual'
      ? text.studiedManual(formatMeasuredSeconds(session.studySeconds ?? 0, language))
      : text.studied(formatMeasuredSeconds(session.studySeconds ?? 0, language), session.trackingCoverage === 'partial');
