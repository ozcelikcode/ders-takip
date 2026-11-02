import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import PomodoroPage from './PomodoroPage';
vi.mock('../../services/api', () => ({ studySessionsAPI: { getSessions: vi.fn(), getSession: vi.fn(), controlPomodoro: vi.fn() } }));
vi.mock('../../hooks/useAccountQueryKeys', () => ({ useAccountQueryKeys: () => ({ sessions: (...parts: unknown[]) => ['account', '1', 'sessions', ...parts] }) }));
vi.mock('../../hooks/useCurrentDateKey', () => ({ useCurrentDateKey: () => '2026-10-16' }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('recovers an unfinished session from a previous day and renders the shared timer', async () => {
  const session = { id: 1, userId: 1, title: 'Previous day', startTime: '2026-10-15T23:00:00Z', endTime: '2026-10-16T02:00:00Z', duration: 180, status: 'paused' as const, sessionType: 'pomodoro' as const, updatedAt: '2026-10-16T09:00:00Z', createdAt: '2026-10-15T09:00:00Z', pomodoroClock: { phase: 'short_break' as const, cycle: 2, remainingMilliseconds: 44000, deadlineAt: null, autoStartBreaks: false, completedWorkCycles: 1 } };
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue({ data: { success: true, data: { sessions: [session] } }, status: 200, config: { url: '' } });
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue({ data: { success: true, data: { session } }, status: 200, config: { url: '' } });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><PomodoroPage /></MemoryRouter></QueryClientProvider>);
  const timer = await screen.findByRole('region', { name: 'Pomodoro sayacı' });
  expect(within(timer).getByRole('status').textContent).toBe('Kısa mola'); expect(within(timer).getByRole('timer').textContent).toBe('Kalan süre: 00:44');
  // Only unfinished sessions and the last week are requested, never the whole history.
  expect(studySessionsAPI.getSessions).toHaveBeenCalledWith({ sessionType: 'pomodoro', unfinished: 'true' });
  expect(studySessionsAPI.getSessions).toHaveBeenCalledWith({ sessionType: 'pomodoro', startDate: '2026-10-10', endDate: '2026-10-16' });
  expect(screen.getAllByRole('button', { name: /Previous day/ })).toHaveLength(1);
});

it('keeps a session it finished on screen even when the list no longer loads it', async () => {
  // Started early: tomorrow's session is outside the last week, so once finished the list query drops it.
  const running = { id: 2, userId: 1, title: 'Started early', startTime: '2026-10-17T15:00:00Z', endTime: '2026-10-17T16:00:00Z', duration: 60, status: 'in_progress' as const, sessionType: 'pomodoro' as const, updatedAt: '2026-10-16T09:00:00Z', createdAt: '2026-10-16T08:00:00Z', pomodoroClock: { phase: 'work' as const, cycle: 1, remainingMilliseconds: 1_400_000, deadlineAt: '2099-01-01T00:00:00Z', autoStartBreaks: false, completedWorkCycles: 0 } };
  const done = { ...running, status: 'completed' as const, updatedAt: '2026-10-16T09:05:00Z', pomodoroClock: { ...running.pomodoroClock, deadlineAt: null } };
  const list = (sessions: unknown[]) => ({ data: { success: true, data: { sessions } }, status: 200, config: { url: '' } }) as never;
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValueOnce(list([running])).mockResolvedValueOnce(list([])).mockResolvedValue(list([]));
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue({ data: { success: true, data: { session: running } }, status: 200, config: { url: '' } });
  vi.mocked(studySessionsAPI.controlPomodoro).mockResolvedValue({ data: { success: true, data: { session: done } }, status: 200, config: { url: '' } } as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><PomodoroPage /></MemoryRouter></QueryClientProvider>);
  const timer = await screen.findByRole('region', { name: 'Pomodoro sayacı' });
  const complete = within(timer).getByRole('button', { name: 'Seansı tamamla' });
  await vi.waitFor(() => expect(complete.hasAttribute('disabled')).toBe(false));
  fireEvent.click(complete);
  // The list refetch after completion returns nothing; the finished session and its confirmation stay.
  await vi.waitFor(() => expect(studySessionsAPI.getSessions).toHaveBeenCalledTimes(4));
  expect(within(await screen.findByRole('region', { name: 'Pomodoro sayacı' })).getByRole('status').textContent).toBe('Seans tamamlandı');
  expect(screen.getByRole('button', { name: /Started early/ }).getAttribute('aria-pressed')).toBe('true');
});
