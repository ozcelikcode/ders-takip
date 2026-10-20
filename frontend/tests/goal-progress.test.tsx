import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GoalProgress from '../src/components/dashboard/GoalProgress';
import { studySessionsAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('../src/services/api', () => ({ studySessionsAPI: { getStats: vi.fn() } }));

const stats = (days: { date: string; studySeconds: number }[]) =>
  ({ data: { success: true, data: { stats: { days } } } }) as never;

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <GoalProgress />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // 2026-10-21 (Wednesday) 12:00 UTC; the week starts on Monday 2026-10-19.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
  useAuthStore.setState({ user: { id: '1' } as never });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('compares measured time with the daily and weekly goals and requests the configured week', async () => {
  useUserPreferencesStore.setState({
    preferences: { ...defaultPreferences, timezone: 'UTC', dailyStudyGoal: 2, weeklyStudyGoal: 10, activeStudyDays: [1, 2, 3, 4, 5] },
  });
  vi.mocked(studySessionsAPI.getStats).mockResolvedValue(
    stats([
      { date: '2026-10-19', studySeconds: 3600 },
      { date: '2026-10-21', studySeconds: 1800 },
    ]),
  );
  mount();
  const today = await screen.findByRole('progressbar', { name: 'Bugün hedefi' });
  expect(today.getAttribute('aria-valuenow')).toBe('25');
  expect(screen.getByRole('progressbar', { name: 'Bu hafta hedefi' }).getAttribute('aria-valuenow')).toBe('15');
  expect(screen.getByText('30 dk 0 sn / 2 sa')).toBeTruthy();
  expect(studySessionsAPI.getStats).toHaveBeenCalledWith({ startDate: '2026-10-19', endDate: '2026-10-25' });
});

it('says when today is a rest day or a goal is unset instead of showing an empty bar', async () => {
  useUserPreferencesStore.setState({
    // No active days: today is a rest day and the derived weekly goal is empty.
    preferences: { ...defaultPreferences, timezone: 'UTC', activeStudyDays: [] },
  });
  vi.mocked(studySessionsAPI.getStats).mockResolvedValue(stats([]));
  mount();
  expect(await screen.findByText('Bugün çalışma günün değil')).toBeTruthy();
  expect(screen.getByText('Haftalık hedef yok')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
});
