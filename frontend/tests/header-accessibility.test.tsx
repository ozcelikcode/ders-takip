import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Header from '../src/components/common/Header';
import RecentActivities from '../src/components/dashboard/RecentActivities';
import { studySessionsAPI } from '../src/services/api';
import type { StudySession } from '../src/types/planner';
const auth = vi.hoisted(() => ({
  epoch: 1,
  user: {
    id: '1',
    fullName: 'Test User',
    email: 'test@example.com',
    role: 'student',
  },
  logout: vi.fn(),
}));
vi.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (select?: (state: typeof auth) => unknown) => (select ? select(auth) : auth),
    { getState: () => auth },
  ),
}));
vi.mock('../src/hooks/useAccountQueryKeys', () => ({
  useAccountQueryKeys: () => ({
    sessions: (...parts: unknown[]) => [
      'account',
      auth.user.id,
      'sessions',
      ...parts,
    ],
  }),
}));
vi.mock('../src/services/api', () => ({
  studySessionsAPI: { getSessions: vi.fn() },
}));
const session: StudySession = {
  id: 42,
  userId: 1,
  title: 'Completed fixture',
  startTime: '2026-10-16T06:00:00Z',
  endTime: '2026-10-16T07:00:00Z',
  duration: 60,
  status: 'completed',
  sessionType: 'study',
  trackingCoverage: 'complete',
  studySeconds: 300,
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: '2026-10-16T00:00:01Z',
};
const response = (sessions: StudySession[]) =>
  ({ data: { success: true, data: { sessions } } }) as Awaited<
    ReturnType<typeof studySessionsAPI.getSessions>
  >;
let client: QueryClient;
beforeEach(() => {
  auth.epoch = 1;
  auth.user.id = '1';
  localStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(response([]));
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Header onMenuClick={vi.fn()} />
        <button type="button">Outside</button>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const trigger = () =>
  screen.getByRole('button', { name: /^Bildirimler(?:,|$)/ });
const open = () => {
  trigger().focus();
  fireEvent.click(trigger());
};
it('distinguishes pending, request failure, explicit retry and a genuine empty response', async () => {
  let reject!: (error: Error) => void;
  vi.mocked(studySessionsAPI.getSessions).mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  mount();
  open();
  await screen.findByText('Bildirimler yükleniyor…');
  expect(screen.queryByText('Henüz bildirim yok')).toBeNull();
  await act(() => reject(new Error('Offline')));
  await screen.findByText('Bildirimler alınamadı.');
  expect(screen.queryByText('Henüz bildirim yok')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Bildirimleri tekrar yükle' }),
  );
  await screen.findByText('Henüz bildirim yok');
  expect(studySessionsAPI.getSessions).toHaveBeenCalledTimes(2);
});
it('rejects a missing sessions payload instead of reporting no notifications', async () => {
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue({
    data: { success: true },
  } as Awaited<ReturnType<typeof studySessionsAPI.getSessions>>);
  mount();
  open();
  await screen.findByText('Bildirimler alınamadı.');
  expect(screen.queryByText('Henüz bildirim yok')).toBeNull();
});
it('restores focus on Escape and closes the other header popover when switching', async () => {
  mount();
  open();
  const close = await screen.findByRole('button', {
    name: 'Bildirimleri kapat',
  });
  await waitFor(() => expect(document.activeElement).toBe(close));
  fireEvent.keyDown(close, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(document.activeElement).toBe(trigger()));
  expect(screen.queryByRole('region', { name: 'Bildirimler' })).toBeNull();
  open();
  await screen.findByRole('region', { name: 'Bildirimler' });
  fireEvent.click(screen.getByRole('button', { name: 'Hesap menüsü Test User Kullanıcı' }));
  await screen.findByRole('navigation', { name: 'Hesap' });
  expect(screen.queryByRole('region', { name: 'Bildirimler' })).toBeNull();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: 'Profil' }),
    ),
  );
  fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' });
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Hesap menüsü Test User Kullanıcı' }),
    ),
  );
});
it('closes on outside interaction while leaving focus on the outside target', async () => {
  mount();
  open();
  await screen.findByRole('region', { name: 'Bildirimler' });
  const outside = screen.getByRole('button', { name: 'Outside' });
  fireEvent.mouseDown(outside);
  outside.focus();
  fireEvent.mouseUp(outside);
  fireEvent.click(outside);
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Bildirimler' })).toBeNull(),
  );
  expect(document.activeElement).toBe(outside);
});
it('marks only the visible latest five, persists per account and preserves focus after the action disappears', async () => {
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(
    response(
      Array.from({ length: 7 }, (_, index) => ({
        ...session,
        id: index + 1,
        title: `Fixture ${index + 1}`,
        endTime: `2026-10-${String(index + 1).padStart(2, '0')}T07:00:00Z`,
      })),
    ),
  );
  mount();
  await waitFor(() =>
    expect(trigger().getAttribute('aria-label')).toBe(
      'Bildirimler, 5 okunmamış',
    ),
  );
  open();
  await screen.findByText('Fixture 7');
  expect(screen.queryByText('Fixture 1')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Görünenleri okundu işaretle' }),
  );
  await screen.findByText('5 bildirim okundu olarak işaretlendi.');
  expect(
    JSON.parse(localStorage.getItem('read-notifications:1') ?? '[]'),
  ).toEqual([7, 6, 5, 4, 3]);
  expect(localStorage.getItem('read-notifications:2')).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Bildirimleri kapat' }),
  );
  expect(
    screen.queryByRole('button', { name: 'Görünenleri okundu işaretle' }),
  ).toBeNull();
});
it('shows stale records as stale after refresh failure and blocks misleading read actions', async () => {
  vi.mocked(studySessionsAPI.getSessions)
    .mockResolvedValueOnce(response([session]))
    .mockRejectedValue(new Error('Offline'));
  mount();
  await waitFor(() =>
    expect(trigger().getAttribute('aria-label')).toBe(
      'Bildirimler, 1 okunmamış',
    ),
  );
  open();
  await screen.findByText(session.title);
  await act(() =>
    client.invalidateQueries({ queryKey: ['account', '1', 'sessions'] }),
  );
  await screen.findByText(
    'Bildirimler alınamadı. Son alınan kayıtlar gösteriliyor.',
  );
  expect(trigger().getAttribute('aria-label')).toBe('Bildirimler');
  expect(
    screen
      .getByRole('button', { name: `${session.title}: okundu olarak işaretle` })
      .hasAttribute('disabled'),
  ).toBe(true);
});
it('does not accept a late notification read from a previous auth epoch', async () => {
  let resolve!: (
    value: Awaited<ReturnType<typeof studySessionsAPI.getSessions>>,
  ) => void;
  vi.mocked(studySessionsAPI.getSessions).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  mount();
  open();
  auth.epoch++;
  await act(() => resolve(response([session])));
  await screen.findByText('Bildirimler alınamadı.');
  expect(screen.queryByText(session.title)).toBeNull();
});

it('shares one recent-sessions request between the header and the dashboard activity list', async () => {
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(response([session]));
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Header onMenuClick={vi.fn()} />
        <RecentActivities />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('Completed fixture');
  await waitFor(() => expect(trigger().getAttribute('aria-label')).toBe('Bildirimler, 1 okunmamış'));
  expect(studySessionsAPI.getSessions).toHaveBeenCalledTimes(1);
});
