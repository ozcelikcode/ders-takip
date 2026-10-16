import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import type { StudySession } from '../../types/planner';
import PomodoroPage from './PomodoroPage';

vi.mock('../../services/api', () => ({ studySessionsAPI: { getSessions: vi.fn(), startSession: vi.fn(), pauseSession: vi.fn() } }));
vi.mock('../../hooks/useAccountQueryKeys', () => ({ useAccountQueryKeys: () => ({ sessions: (...parts: unknown[]) => ['account', '1', 'sessions', ...parts] }) }));
vi.mock('../../hooks/useCurrentDateKey', () => ({ useCurrentDateKey: () => '2026-10-16' }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('persists the main timer pause and resumes with the acknowledged server version', async () => {
  const running: StudySession = { id: 1, userId: 1, title: 'Fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T10:00:00Z', duration: 60, status: 'in_progress', sessionType: 'pomodoro', updatedAt: '2026-10-16T09:00:00.000Z', createdAt: '2026-10-16T09:00:00.000Z', pomodoroSettings: { workDuration: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLongBreak: 4, currentCycle: 0 } };
  const paused = { ...running, status: 'paused' as const, updatedAt: '2026-10-16T09:00:00.001Z' };
  let current = running;
  vi.mocked(studySessionsAPI.getSessions).mockImplementation(async () => ({ data: { success: true, data: { sessions: [current] } } }) as Awaited<ReturnType<typeof studySessionsAPI.getSessions>>);
  vi.mocked(studySessionsAPI.pauseSession).mockImplementation(async () => { current = paused; return { data: { success: true, data: { session: paused } } } as Awaited<ReturnType<typeof studySessionsAPI.pauseSession>>; });
  vi.mocked(studySessionsAPI.startSession).mockImplementation(async () => { current = { ...running, updatedAt: '2026-10-16T09:00:00.002Z' }; return { data: { success: true, data: { session: current } } } as Awaited<ReturnType<typeof studySessionsAPI.startSession>>; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PomodoroPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Duraklat' }));
  await waitFor(() => expect(studySessionsAPI.pauseSession).toHaveBeenCalledWith(running));
  const resume = await screen.findByRole('button', { name: 'Devam et' });
  await waitFor(() => expect((resume as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(resume);
  await waitFor(() => expect(studySessionsAPI.startSession).toHaveBeenCalledWith(paused));
  await screen.findByRole('button', { name: 'Duraklat' });
});
