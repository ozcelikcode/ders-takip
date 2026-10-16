import { useEffect, useRef, useState } from 'react';
import { CanceledError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { defaultPomodoroSettings, phaseMilliseconds, pomodoroRemaining, type PomodoroCommand } from '@study-tracker/contracts';
import { studySessionsAPI } from '../services/api';
import type { StudySession } from '../types/planner';
import { useAccountQueryKeys } from './useAccountQueryKeys';
import { useAuthStore } from '../store/authStore';

export const observePomodoro = (session: StudySession) => ({ session, wallTime: Date.now(), monotonicTime: performance.now(), serverTime: Date.parse(session.serverNow ?? session.asOf ?? new Date().toISOString()) });
export type PomodoroObservation = ReturnType<typeof observePomodoro>;
export const observedServerTime = (observation: PomodoroObservation) => observation.serverTime + Math.max(0, Date.now() - observation.wallTime, performance.now() - observation.monotonicTime);

export function usePomodoro(initialSession: StudySession, onComplete?: () => void) {
  const keys = useAccountQueryKeys();
  const client = useQueryClient();
  const queryKey = keys.sessions('pomodoro-clock', initialSession.id);
  const [, renderClock] = useState(0);
  const dueRefresh = useRef<string | null>(null);
  const operationEpoch = useRef<number | null>(null);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const epoch = useAuthStore.getState().epoch;
      const response = await studySessionsAPI.getSession(String(initialSession.id));
      if (useAuthStore.getState().epoch !== epoch) throw new CanceledError('Account changed');
      if (!response.data.data?.session) throw new Error('Missing session response');
      return observePomodoro(response.data.data.session);
    },
    initialData: () => observePomodoro(initialSession),
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchInterval: state => {
      const observed = state.state.data;
      const deadline = observed?.session.pomodoroClock?.deadlineAt;
      return state.state.status !== 'error' && observed && deadline && Date.parse(deadline) <= observedServerTime(observed) ? 2000 : 30000;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    structuralSharing: (previous, incoming) => {
      const old = previous as PomodoroObservation | undefined;
      const next = incoming as PomodoroObservation;
      return old && (Date.parse(old.session.updatedAt) > Date.parse(next.session.updatedAt) || old.session.updatedAt === next.session.updatedAt && old.serverTime > next.serverTime) ? old : next;
    },
  });
  const observation = query.data;
  const session = observation.session;
  const clock = session.pomodoroClock;
  useEffect(() => {
    if (Date.parse(initialSession.updatedAt) > Date.parse(session.updatedAt)) client.setQueryData(queryKey, observePomodoro(initialSession));
  }, [initialSession, session.updatedAt, client, queryKey]);
  const settings = session.pomodoroSettings ?? defaultPomodoroSettings;
  const phase = clock?.phase ?? 'work';
  const remaining = clock ? pomodoroRemaining(clock, observedServerTime(observation)) : phaseMilliseconds('work', settings);
  const command = useMutation({
    mutationFn: async (input: Omit<PomodoroCommand, 'expectedUpdatedAt'>) => {
      const epoch = useAuthStore.getState().epoch;
      operationEpoch.current = epoch;
      const response = await studySessionsAPI.controlPomodoro(session, input);
      if (useAuthStore.getState().epoch !== epoch) throw new CanceledError('Account changed');
      if (!response.data.data?.session) throw new Error('Missing timer response');
      return { updated: response.data.data.session, epoch };
    },
    onSuccess: ({ updated, epoch }, input) => {
      if (useAuthStore.getState().epoch !== epoch) return;
      client.setQueryData(queryKey, observePomodoro(updated));
      void client.invalidateQueries({ queryKey: keys.sessions() });
      if (input.command === 'complete') onComplete?.();
    },
    onError: () => { if (operationEpoch.current === useAuthStore.getState().epoch) void query.refetch(); },
  });
  useEffect(() => {
    if (!clock?.deadlineAt) return;
    const interval = window.setInterval(() => renderClock(value => value + 1), 250);
    return () => window.clearInterval(interval);
  }, [clock?.deadlineAt]);
  useEffect(() => {
    if (!clock?.deadlineAt || remaining > 0 || dueRefresh.current === clock.deadlineAt) return;
    dueRefresh.current = clock.deadlineAt;
    // The server owns phase completion. This refresh never sends a timer mutation.
    void query.refetch();
  }, [clock?.deadlineAt, remaining, query.refetch]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void query.refetch(); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [query.refetch]);
  return { session, phase, cycle: clock?.cycle ?? 1, timeLeft: Math.ceil(remaining / 1000),
    progress: Math.max(0, Math.min(100, (1 - remaining / phaseMilliseconds(phase, settings)) * 100)),
    isRunning: session.status === 'in_progress' && !!clock?.deadlineAt,
    isPending: command.isPending || query.isFetching,
    error: query.isError || command.isError,
    run: command.mutate,
    refresh: query.refetch,
  };
}
