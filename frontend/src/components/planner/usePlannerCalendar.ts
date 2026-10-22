import { useTerms } from '../../hooks/useTerms';
import { useEffect, useRef, useState } from 'react';
import { isHttpError, serverMessage } from '../../services/httpError';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDate, calendarViewDate } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { studySessionsAPI } from '../../services/api';
import type { StudySession } from '../../types/planner';
import { addDays, format, startOfWeek } from '../../utils/calendarDates';
import { useWeekStart } from '../../hooks/useWeekStart';
import { canStartSession } from '../../utils/sessionHelpers';
import {
  canRepositionSession,
  moveSessionTimes,
  type CalendarMode,
} from './calendarGeometry';

type Confirmation = {
  session: StudySession;
  action: 'pause' | 'complete' | 'delete';
};
const errorMessage = (error: unknown) =>
  isHttpError(error)
    ? (serverMessage(error) ?? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.')
    : error instanceof Error
      ? error.message
      : 'İşlem tamamlanamadı.';

export function usePlannerCalendar(mode: CalendarMode, initialDate?: string) {
  const weekStart = useWeekStart();
  const t = useTerms();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const keys = useAccountQueryKeys();
  const client = useQueryClient();
  const today = () => calendarViewDate(new Date(), timezone);
  const [date, setDate] = useState(() =>
    initialDate ? new CalendarDate(Date.parse(`${initialDate}T00:00:00Z`)) : today(),
  );
  const firstTimezone = useRef(timezone);
  const [now, setNow] = useState(today);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [moving, setMoving] = useState<StudySession | null>(null);
  const [timer, setTimer] = useState<StudySession | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  useEffect(() => {
    // Keep a deep-linked day on mount; a later time zone change returns to today.
    if (firstTimezone.current === timezone) return;
    firstTimezone.current = timezone;
    setDate(today());
    setNow(today());
  }, [timezone]);
  useEffect(() => {
    const refresh = () => setNow(today());
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [timezone]);
  const start = mode === 'weekly' ? startOfWeek(date, weekStart) : date;
  const days = Array.from({ length: mode === 'weekly' ? 7 : 1 }, (_, index) =>
    addDays(start, index),
  );
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(days[days.length - 1]!, 'yyyy-MM-dd');
  const query = useQuery({
    queryKey: keys.sessions('calendar', mode, startDate, endDate),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        startDate,
        endDate,
        timezone,
      });
      const sessions = response.data.data?.sessions;
      if (!sessions) throw new Error('Missing calendar sessions');
      return sessions;
    },
  });
  const perform = async (
    operation: () => Promise<unknown>,
    success: string,
  ) => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    const epoch = useAuthStore.getState().epoch;
    try {
      await operation();
      if (useAuthStore.getState().epoch !== epoch) return false;
      await client.invalidateQueries({ queryKey: keys.sessions() });
      if (useAuthStore.getState().epoch !== epoch) return false;
      toast.success(success);
      return true;
    } catch (error) {
      if (useAuthStore.getState().epoch === epoch) {
        toast.error(errorMessage(error));
        // A stale snapshot must be re-read, never retried automatically.
        if (isHttpError(error) && error.response?.status === 409) {
          const refreshed = await query.refetch();
          if (useAuthStore.getState().epoch === epoch && refreshed.data) {
            const latest = (session: StudySession) =>
              refreshed.data.find((item) => item.id === session.id) ?? session;
            setMoving((previous) => (previous ? latest(previous) : null));
            setConfirmation((previous) =>
              previous
                ? { ...previous, session: latest(previous.session) }
                : null,
            );
          }
        }
      }
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const move = async (
    session: StudySession,
    target: Date,
    minute?: number,
    duration?: number,
  ) => {
    if (!canRepositionSession(session)) return false;
    return perform(() => {
      const times = moveSessionTimes(session, target, timezone, minute);
      return studySessionsAPI.updateSession(session, {
        ...times,
        ...(duration === undefined
          ? {}
          : {
              endTime: new Date(
                Date.parse(times.startTime) + duration * 60_000,
              ).toISOString(),
            }),
      });
    }, 'Oturum taşındı');
  };
  const resize = async (session: StudySession, minutes: number) => {
    if (!canRepositionSession(session)) return false;
    return perform(
      () =>
        studySessionsAPI.updateSession(session, {
          endTime: new Date(
            Date.parse(session.startTime) + minutes * 60000,
          ).toISOString(),
        }),
      'Süre güncellendi',
    );
  };
  const reloadMoving = async () => {
    const epoch = useAuthStore.getState().epoch;
    const result = await query.refetch();
    if (useAuthStore.getState().epoch !== epoch || !result.isSuccess) return;
    setMoving((previous) =>
      previous
        ? (result.data.find((session) => session.id === previous.id) ??
          previous)
        : null,
    );
  };
  const openTimer = (session: StudySession) => {
    setTimer(session);
    setMinimized(false);
  };
  const startSession = async (session: StudySession) => {
    if (!canStartSession(session)) {
      toast.error(
        'Bu oturumun saati geçmiş. Lütfen oturum saatini güncelleyin.',
      );
      return;
    }
    if (session.sessionType === 'pomodoro') {
      openTimer(session);
      return;
    }
    await perform(
      () => studySessionsAPI.startSession(session),
      `${t.session({ capitalize: true })} başlatıldı`,
    );
  };
  const confirm = async () => {
    if (!confirmation) return false;
    const { session, action } = confirmation;
    const operation = () =>
      action === 'pause'
        ? studySessionsAPI.pauseSession(session)
        : action === 'complete'
          ? studySessionsAPI.completeSession(session)
          : studySessionsAPI.deleteSession(session);
    const success = await perform(
      operation,
      action === 'pause'
        ? `${t.session({ capitalize: true })} duraklatıldı`
        : action === 'complete'
          ? `${t.session({ capitalize: true })} tamamlandı`
          : `${t.session({ capitalize: true })} silindi`,
    );
    if (success) setConfirmation(null);
    return success;
  };
  return {
    timezone,
    date,
    now,
    days,
    query,
    pending,
    setDate,
    today,
    navigate: (direction: number) =>
      setDate((previous) => addDays(previous, direction * days.length)),
    editing,
    setEditing,
    moving,
    setMoving,
    reloadMoving,
    timer,
    setTimer,
    minimized,
    setMinimized,
    confirmation,
    setConfirmation,
    confirm,
    openTimer,
    startSession,
    move,
    resize,
  };
}
