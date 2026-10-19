import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import StatsPage from '../src/pages/stats/StatsPage';
import { coursesAPI, studySessionsAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('../src/services/api', () => ({
  studySessionsAPI: { getStats: vi.fn() },
  coursesAPI: { getCourses: vi.fn() },
}));

const stats = {
  studySeconds: 5400,
  breakSeconds: 600,
  pauseSeconds: 0,
  completedSessions: 3,
  untrackedSessions: 1,
  partialSessions: 0,
  // The server returns every day in the requested range.
  days: ['19', '20', '21', '22', '23', '24', '25'].map((day) => ({
    date: `2026-10-${day}`,
    studySeconds: day === '19' ? 3600 : day === '20' ? 1800 : 0,
    breakSeconds: 0,
    pauseSeconds: 0,
  })),
  courses: [
    { courseId: 4, studySeconds: 3600, sessions: 2 },
    { courseId: null, studySeconds: 1800, sessions: 1 },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
  useAuthStore.setState({ user: { id: '1' } as never });
  useUserPreferencesStore.setState({
    preferences: { ...defaultPreferences, timezone: 'UTC', dailyStudyGoal: 1, activeStudyDays: [1, 2, 3, 4, 5] },
  });
  vi.mocked(studySessionsAPI.getStats).mockResolvedValue({ data: { success: true, data: { stats } } } as never);
  vi.mocked(coursesAPI.getCourses).mockResolvedValue({
    data: {
      success: true,
      data: {
        courses: [
          { id: 4, name: 'Mobil uygulama', categoryId: 9, category: { id: 9, name: 'İş', color: '#3b82f6' }, color: '#3b82f6', order: 1, isActive: true, isGlobal: false },
        ],
      },
    },
  } as never);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('shows range totals, goal comparison and course/category distribution, and refetches on range change', async () => {
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <StatsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText('1 sa 30 dk')).toBeTruthy();
  expect(studySessionsAPI.getStats).toHaveBeenCalledWith({ startDate: '2026-10-19', endDate: '2026-10-25' });
  // Week has 5 active days with a 1 hour goal; Monday met it.
  expect(screen.getByText('Hedefe ulaşılan gün: 1 / 5')).toBeTruthy();
  const byCategory = await screen.findByRole('region', { name: 'Kategoriye göre' });
  expect(within(byCategory).getByText('İş')).toBeTruthy();
  expect(within(byCategory).getByText('Atanmamış')).toBeTruthy();
  const byCourse = screen.getByRole('region', { name: 'Ders bazında' });
  expect(within(byCourse).getByText('Mobil uygulama')).toBeTruthy();
  expect(within(byCourse).getByText(/%67/)).toBeTruthy();
  expect(screen.getByText(/1 kayıt süreye kısmen veya hiç dahil değildir/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Bu ay' }));
  await waitFor(() =>
    expect(studySessionsAPI.getStats).toHaveBeenCalledWith({ startDate: '2026-10-01', endDate: '2026-10-31' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Özel' }));
  fireEvent.change(screen.getByLabelText('Başlangıç'), { target: { value: '2026-11-01' } });
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toMatch(/Başlangıç, bitişten sonra olamaz/);
});
