import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultPreferences } from '@study-tracker/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LogStudyDialog from '../src/components/planner/LogStudyDialog';
import { coursesAPI, studySessionsAPI } from '../src/services/api';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('../src/services/api', () => ({
  coursesAPI: { getCourses: vi.fn() },
  studySessionsAPI: { logStudy: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../src/hooks/useCurrentDateKey', () => ({ useCurrentDateKey: () => '2026-10-20' }));

const mount = (onClose = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LogStudyDialog onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
};
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-10-20T15:00:00Z'));
  useUserPreferencesStore.getState().bindUser('1', { ...defaultPreferences, timezone: 'Europe/Istanbul' });
  vi.mocked(coursesAPI.getCourses).mockResolvedValue({
    data: { success: true, data: { courses: [{ id: 4, name: 'Gitar', isActive: true }, { id: 5, name: 'Eski', isActive: false }] } },
  } as never);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it('logs finished study in the preferred time zone, named after the record when no title is given', async () => {
  vi.mocked(studySessionsAPI.logStudy).mockResolvedValue({} as never);
  const onClose = mount();
  await screen.findByRole('option', { name: 'Gitar' });
  expect(screen.queryByRole('option', { name: 'Eski' })).toBeNull();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
  type('Başlangıç saati', '10:15');
  type('Süre (dakika)', '45');
  type('Notlar', ' Akorlar ');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(studySessionsAPI.logStudy).toHaveBeenCalledWith({
    title: 'Gitar', courseId: 4, startTime: '2026-10-20T07:15:00.000Z', endTime: '2026-10-20T08:00:00.000Z', notes: 'Akorlar',
  });
});

it('refuses study that has not ended yet without calling the server', async () => {
  mount();
  type('Başlık', 'Okuma');
  type('Başlangıç saati', '17:30');
  type('Süre (dakika)', '60');
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Bitiş şu andan sonra olamaz');
  expect(studySessionsAPI.logStudy).not.toHaveBeenCalled();
});
