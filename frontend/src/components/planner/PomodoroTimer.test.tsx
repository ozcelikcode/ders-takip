import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import type { StudySession } from '../../types/planner';
import PomodoroTimer from './PomodoroTimer';

vi.mock('../../services/api', () => ({ studySessionsAPI: { updateSession: vi.fn(), completeSession: vi.fn() } }));
vi.mock('../../hooks/useAccountQueryKeys', () => ({ useAccountQueryKeys: () => ({ sessions: () => ['account', '1', 'sessions'] }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const initial: StudySession = { id: 1, userId: 1, title: 'Fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T10:00:00Z', duration: 60, status: 'planned', sessionType: 'pomodoro', updatedAt: '2026-10-16T09:00:00.000Z', createdAt: '2026-10-16T09:00:00.000Z' };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><PomodoroTimer session={initial} /></QueryClientProvider>);

it('uses the acknowledged session version for pause and completion after starting', async () => {
  const running = { ...initial, status: 'in_progress' as const, updatedAt: '2026-10-16T09:00:00.001Z' };
  const paused = { ...running, status: 'paused' as const, updatedAt: '2026-10-16T09:00:00.002Z' };
  vi.mocked(studySessionsAPI.updateSession).mockResolvedValueOnce({ data: { success: true, data: { session: running } } } as Awaited<ReturnType<typeof studySessionsAPI.updateSession>>).mockResolvedValueOnce({ data: { success: true, data: { session: paused } } } as Awaited<ReturnType<typeof studySessionsAPI.updateSession>>);
  vi.mocked(studySessionsAPI.completeSession).mockResolvedValue({ data: { success: true, data: { session: { ...paused, status: 'completed' } } } } as Awaited<ReturnType<typeof studySessionsAPI.completeSession>>);
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Sayacı başlat' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sayacı duraklat' })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Sayacı duraklat' }));
  await waitFor(() => expect(studySessionsAPI.updateSession).toHaveBeenNthCalledWith(2, running, { status: 'paused' }));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Seansı tamamla' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Seansı tamamla' }));
  await waitFor(() => expect(studySessionsAPI.completeSession).toHaveBeenCalledWith(paused, expect.any(Object)));
});
it('keeps the timer stopped when the server rejects starting', async () => {
  vi.mocked(studySessionsAPI.updateSession).mockRejectedValue(new Error('Conflict'));
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Sayacı başlat' }));
  await waitFor(() => expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Sayacı başlat' }) as HTMLButtonElement).disabled).toBe(false));
  expect(screen.queryByRole('button', { name: 'Sayacı duraklat' })).toBeNull();
});
