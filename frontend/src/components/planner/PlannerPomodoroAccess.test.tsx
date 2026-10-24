import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import DailyCalendar from './DailyCalendar';
import WeeklyPlanner from './WeeklyPlanner';
vi.mock('../../services/api', () => ({ studySessionsAPI: { getSessions: vi.fn(), startSession: vi.fn() } }));
vi.mock('../../hooks/useAccountQueryKeys', () => ({ useAccountQueryKeys: () => ({ sessions: (...parts: unknown[]) => ['account', '1', 'sessions', ...parts] }) }));
vi.mock('./PomodoroModal', () => ({ default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog">Shared timer</div> : null }));
vi.mock('./CreateSessionModal', () => ({ default: ({ isOpen, editSession }: { isOpen: boolean; editSession?: { title?: string } | null }) => isOpen ? <div role="dialog">Edit: {editSession?.title ?? 'new'}</div> : null }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it.each([['daily', DailyCalendar], ['weekly', WeeklyPlanner]] as const)('opens the shared clock for paused Pomodoro sessions in the %s planner without starting a separate timer', async (_name, Calendar) => {
  const start = new Date(Date.now() - 5 * 60000); const end = new Date(start.getTime() + 120 * 60000);
  const session = { id: 1, userId: 1, title: 'Paused timer', startTime: start.toISOString(), endTime: end.toISOString(), duration: 120, status: 'paused' as const, sessionType: 'pomodoro' as const, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue({ data: { success: true, data: { sessions: [session] } }, status: 200, config: { url: '' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Calendar /></QueryClientProvider>);
  const timerButtons = await screen.findAllByRole('button', { name: 'Pomodoro sayacını aç' });
  fireEvent.click(timerButtons[0]);
  expect(await screen.findByRole('dialog')).toBeTruthy(); expect(studySessionsAPI.startSession).not.toHaveBeenCalled(); client.clear();
});
it('opens the edit modal when clicking a session card in the weekly planner', async () => {
  const start = new Date(Date.now() - 5 * 60000); const end = new Date(start.getTime() + 60 * 60000);
  const session = { id: 2, userId: 1, title: 'Editable weekly session', startTime: start.toISOString(), endTime: end.toISOString(), duration: 60, status: 'planned' as const, sessionType: 'study' as const, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue({ data: { success: true, data: { sessions: [session] } }, status: 200, config: { url: '' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><WeeklyPlanner /></QueryClientProvider>);
  const titles = await screen.findAllByText('Editable weekly session');
  fireEvent.click(titles[0]);
  expect(await screen.findByText('Edit: Editable weekly session')).toBeTruthy();
  client.clear();
});

