import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import type { StudySession } from '../../types/planner';
import PomodoroTimer from './PomodoroTimer';

vi.mock('../../services/api', () => ({ studySessionsAPI: { getSession: vi.fn(), controlPomodoro: vi.fn() } }));
vi.mock('../../hooks/useAccountQueryKeys', () => ({ useAccountQueryKeys: () => ({ sessions: (...filters: unknown[]) => ['account', '1', 'sessions', ...filters] }) }));
const now = Date.parse('2026-10-16T09:00:00Z');
const initial: StudySession = { id: 1, userId: 1, title: 'Fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T10:00:00Z', duration: 60, status: 'planned', sessionType: 'pomodoro', updatedAt: '2026-10-16T09:00:00.000Z', createdAt: '2026-10-16T09:00:00.000Z', serverNow: new Date(now).toISOString() };
const clock = { phase: 'work' as const, cycle: 1, remainingMilliseconds: 60000, deadlineAt: new Date(now + 60000).toISOString(), autoStartBreaks: false, completedWorkCycles: 0 };
const response = (session: StudySession) => ({ data: { success: true as const, data: { session } }, status: 200, config: { url: '' } });
const mount = (session = initial, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) => {
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue(response(session));
  return { ...render(<QueryClientProvider client={client}><PomodoroTimer session={session} /></QueryClientProvider>), client };
};
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); });
it('starts, pauses and completes using acknowledged versions through the same command transport', async () => {
  let current = initial;
  vi.mocked(studySessionsAPI.getSession).mockImplementation(async () => response(current));
  vi.mocked(studySessionsAPI.controlPomodoro).mockImplementation(async (_snapshot, input) => {
    current = { ...current, status: input.command === 'resume' ? 'in_progress' : input.command === 'pause' ? 'paused' : 'completed', pomodoroClock: { ...clock, deadlineAt: input.command === 'resume' ? clock.deadlineAt : null }, updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString(), serverNow: new Date(now).toISOString() };
    return response(current);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PomodoroTimer session={initial} /></QueryClientProvider>);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Sayacı başlat' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Sayacı başlat' }));
  const pause = await screen.findByRole('button', { name: 'Sayacı duraklat' });
  await waitFor(() => expect((pause as HTMLButtonElement).disabled).toBe(false));
  const running = current; fireEvent.click(pause);
  await waitFor(() => expect(studySessionsAPI.controlPomodoro).toHaveBeenNthCalledWith(2, expect.objectContaining({ updatedAt: running.updatedAt }), { command: 'pause' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Seansı tamamla' }) as HTMLButtonElement).disabled).toBe(false));
  const paused = current; fireEvent.click(screen.getByRole('button', { name: 'Seansı tamamla' }));
  await waitFor(() => expect(studySessionsAPI.controlPomodoro).toHaveBeenNthCalledWith(3, expect.objectContaining({ updatedAt: paused.updatedAt }), { command: 'complete' }));
});
it('keeps a rejected start stopped and allows a deliberate retry after refetch', async () => {
  vi.mocked(studySessionsAPI.controlPomodoro).mockRejectedValue(new Error('Conflict'));
  mount(); await waitFor(() => expect((screen.getByRole('button', { name: 'Sayacı başlat' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Sayacı başlat' }));
  await screen.findByRole('alert');
  await waitFor(() => expect((screen.getByRole('button', { name: 'Sayacı başlat' }) as HTMLButtonElement).disabled).toBe(false));
  expect(screen.queryByRole('button', { name: 'Sayacı duraklat' })).toBeNull(); expect(studySessionsAPI.controlPomodoro).toHaveBeenCalledTimes(1);
});
it('derives remaining time from a deadline after a large clock jump instead of counting callbacks', async () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  const running = { ...initial, status: 'in_progress' as const, pomodoroClock: clock };
  mount(running);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.getByRole('timer').textContent).toBe('01:00');
  vi.setSystemTime(now + 40000);
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
  expect(screen.getByRole('timer').textContent).toBe('00:20');
  expect(studySessionsAPI.controlPomodoro).not.toHaveBeenCalled();
});
it('recovers a paused long break without resetting phase, cycle or remaining time on remount', async () => {
  const paused: StudySession = { ...initial, status: 'paused', pomodoroClock: { ...clock, phase: 'long_break', cycle: 4, remainingMilliseconds: 42500, deadlineAt: null } };
  const first = mount(paused); await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Uzun mola')); expect(screen.getByRole('timer').textContent).toBe('00:43'); first.unmount();
  mount(paused); await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Uzun mola')); expect(screen.getByRole('timer').textContent).toBe('00:43'); expect(screen.getByText('4. döngü / 4')).toBeTruthy();
});
it('does not send completion or phase mutations when a suspended timer reaches zero', async () => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  const running = { ...initial, status: 'in_progress' as const, pomodoroClock: clock };
  mount(running); await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  vi.setSystemTime(now + 600000);
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
  expect(screen.getByRole('timer').textContent).toBe('00:00');
  expect(vi.mocked(studySessionsAPI.getSession).mock.calls.length).toBeGreaterThan(1);
  expect(studySessionsAPI.controlPomodoro).not.toHaveBeenCalled();
});
it('refuses a late older server snapshot after a newer acknowledgement', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const running = { ...initial, status: 'in_progress' as const, pomodoroClock: clock, updatedAt: '2026-10-16T09:00:00.010Z' };
  const { rerender } = mount(running, client); await screen.findByRole('button', { name: 'Sayacı duraklat' });
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue(response(initial));
  await act(async () => { await client.invalidateQueries(); });
  rerender(<QueryClientProvider client={client}><PomodoroTimer session={initial} /></QueryClientProvider>);
  expect(screen.getByRole('button', { name: 'Sayacı duraklat' })).toBeTruthy();
});
it('ignores a late timer response after logout instead of restoring the old clock or firing completion', async () => {
  const { useAuthStore } = await import('../../store/authStore');
  let resolve!: (value: Awaited<ReturnType<typeof studySessionsAPI.controlPomodoro>>) => void;
  vi.mocked(studySessionsAPI.controlPomodoro).mockImplementation(() => new Promise(acknowledge => { resolve = acknowledge; }));
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue(response(initial));
  const complete = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PomodoroTimer session={initial} onComplete={complete} /></QueryClientProvider>);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Seansı tamamla' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Seansı tamamla' }));
  await waitFor(() => expect(studySessionsAPI.controlPomodoro).toHaveBeenCalledTimes(1));
  await act(async () => { useAuthStore.getState().clearAuth(); resolve(response({ ...initial, status: 'completed' })); });
  expect(complete).not.toHaveBeenCalled(); expect(screen.getByRole('status').textContent).toBe('Çalışma zamanı');
  expect(studySessionsAPI.getSession).toHaveBeenCalledTimes(1);
});
