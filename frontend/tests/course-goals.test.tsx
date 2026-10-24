import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseGoalPanel from '../src/components/goals/CourseGoalPanel';
import CourseGoalsProgress from '../src/components/dashboard/CourseGoalsProgress';
import { courseGoalsAPI, coursesAPI, studySessionsAPI } from '../src/services/api';

vi.mock('../src/services/api', () => ({
  courseGoalsAPI: { list: vi.fn(), set: vi.fn(), clear: vi.fn() },
  coursesAPI: { getCourses: vi.fn() },
  studySessionsAPI: { getStats: vi.fn() },
}));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return { useAccountQueryKeys: () => accountQueryKeys('1', 'Europe/Istanbul') };
});
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const course = (id: number, name: string, isActive = true) => ({ id, name, isActive, isGlobal: false, userId: 1, color: '#000000', icon: 'Book', order: id, categoryId: 1, topics: [] });
const stats = (courses: { courseId: number; studySeconds: number }[]) =>
  ({ data: { success: true, data: { stats: { days: [], courses: courses.map((row) => ({ ...row, sessions: 1 })), studySeconds: 0 } } } }) as never;
const mount = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.mocked(studySessionsAPI.getStats).mockResolvedValue(stats([{ courseId: 7, studySeconds: 5400 }]));
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('sets a weekly goal for a record and shows this week’s measured time against it', async () => {
  vi.mocked(courseGoalsAPI.list).mockResolvedValueOnce([]).mockResolvedValue([{ courseId: 7, weeklyMinutes: 180 }]);
  vi.mocked(courseGoalsAPI.set).mockResolvedValue({ courseId: 7, weeklyMinutes: 180 });
  mount(<CourseGoalPanel courseId={7} />);
  expect(await screen.findByText('Henüz haftalık hedef yok.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Hedef belirle' }));
  const goal = screen.getByRole('group', { name: 'Haftalık hedef' });
  // Weekly goals go past a single day.
  expect((within(goal).getByLabelText('Haftalık hedef (saat)') as HTMLInputElement).max).toBe('168');
  fireEvent.click(within(goal).getByRole('button', { name: '3 sa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hedefi kaydet' }));
  await waitFor(() => expect(courseGoalsAPI.set).toHaveBeenCalledWith(7, 180));
  const progress = await screen.findByRole('progressbar', { name: 'Bu hafta hedefi' });
  expect(progress.getAttribute('aria-valuenow')).toBe('50');
  expect(screen.getByText('1 sa 30 dk / 3 sa')).toBeTruthy();
});

it('removes a goal on request', async () => {
  vi.mocked(courseGoalsAPI.list).mockResolvedValueOnce([{ courseId: 7, weeklyMinutes: 60 }]).mockResolvedValue([]);
  vi.mocked(courseGoalsAPI.clear).mockResolvedValue(undefined);
  mount(<CourseGoalPanel courseId={7} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Hedefi değiştir' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hedefi kaldır' }));
  await waitFor(() => expect(courseGoalsAPI.clear).toHaveBeenCalledWith(7));
  expect(await screen.findByText('Henüz haftalık hedef yok.')).toBeTruthy();
});

it('lists goals of active records on the dashboard and shows nothing without any', async () => {
  vi.mocked(coursesAPI.getCourses).mockResolvedValue({ data: { success: true, data: { courses: [course(7, 'Guitar'), course(8, 'Archived', false)] } } } as never);
  vi.mocked(courseGoalsAPI.list).mockResolvedValue([{ courseId: 7, weeklyMinutes: 180 }, { courseId: 8, weeklyMinutes: 60 }]);
  mount(<CourseGoalsProgress />);
  expect(await screen.findByRole('progressbar', { name: 'Guitar hedefi' })).toBeTruthy();
  expect(screen.queryByText('Archived')).toBeNull();
  cleanup();
  vi.mocked(courseGoalsAPI.list).mockResolvedValue([]);
  const { container } = mount(<CourseGoalsProgress />);
  await waitFor(() => expect(courseGoalsAPI.list).toHaveBeenCalled());
  expect(container.textContent).toBe('');
});
