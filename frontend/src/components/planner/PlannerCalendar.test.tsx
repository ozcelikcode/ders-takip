import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { studySessionsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { StudySession } from '../../types/planner';
import DailyCalendar from './DailyCalendar';
import WeeklyPlanner from './WeeklyPlanner';
vi.mock('../../services/api', () => ({
  studySessionsAPI: {
    getSessions: vi.fn(),
    updateSession: vi.fn(),
    startSession: vi.fn(),
    pauseSession: vi.fn(),
    completeSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}));
vi.mock('../../hooks/useAccountQueryKeys', () => ({
  useAccountQueryKeys: () => ({
    sessions: (...parts: unknown[]) => ['account', '1', 'sessions', ...parts],
  }),
}));
vi.mock('./PomodoroModal', () => ({ default: () => null }));
vi.mock('./CreateSessionModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Session editor</div> : null,
}));
const response = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: new AxiosHeaders() },
});
const base: StudySession = {
  id: 1,
  userId: 1,
  title: 'Geometry fixture',
  startTime: '2026-10-16T06:00:00Z',
  endTime: '2026-10-16T07:00:00Z',
  duration: 60,
  status: 'planned',
  sessionType: 'study',
  updatedAt: '2026-10-16T00:00:00Z',
  createdAt: '2026-10-16T00:00:00Z',
};
let client: QueryClient;
let sessions: StudySession[];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-16T05:00:00Z'));
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  useUserPreferencesStore.setState((state) => ({
    preferences: { ...state.preferences, timezone: 'Europe/Istanbul' },
  }));
  sessions = [{ ...base }];
  vi.mocked(studySessionsAPI.getSessions).mockImplementation(async () =>
    response({ success: true, data: { sessions } }),
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function nativeDrag(element: Element, name: string, y: number) {
  const event = new Event(name, { bubbles: true, cancelable: true });
  Object.assign(event, {
    clientY: y,
    dataTransfer: { setData: vi.fn(), effectAllowed: '', dropEffect: '' },
  });
  fireEvent(element, event);
}
function bounds(element: Element, top: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 200,
    width: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

describe.each([
  ['daily', DailyCalendar, 64],
  ['weekly', WeeklyPlanner, 48],
] as const)('%s shared planner', (_mode, Calendar, height) => {
  const mount = () =>
    render(
      <QueryClientProvider client={client}>
        <Calendar onCreateSession={vi.fn()} />
      </QueryClientProvider>,
    );
  const card = async () =>
    (await screen.findByRole('button', { name: base.title })).closest(
      '[draggable]',
    )!;
  it('moves to the same quarter hour using the original optimistic snapshot and blocks duplicate writes', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof studySessionsAPI.updateSession>>,
    ) => void;
    vi.mocked(studySessionsAPI.updateSession).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { container } = mount();
    const item = await card();
    bounds(item, 100, height);
    const slot = container.querySelector(
      '[data-calendar-slot="2026-10-16T11:00"]',
    )!;
    bounds(slot, 400, height);
    nativeDrag(item, 'dragstart', 110);
    nativeDrag(slot, 'dragover', 410 + height / 4);
    nativeDrag(slot, 'drop', 410 + height / 4);
    expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
      startTime: '2026-10-16T08:15:00.000Z',
      endTime: '2026-10-16T09:15:00.000Z',
    });
    nativeDrag(item, 'dragstart', 110);
    nativeDrag(slot, 'drop', 410 + height / 4);
    expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1);
    await act(async () =>
      finish(response({ success: true, data: { session: base } })),
    );
  });
  it('previews a resize and commits elapsed minutes with the original version', async () => {
    vi.mocked(studySessionsAPI.updateSession).mockResolvedValue(
      response({ success: true, data: { session: base } }),
    );
    mount();
    const item = await card();
    const handle = item.querySelector('[data-resize-handle]')!;
    fireEvent.pointerDown(handle, { clientY: 100 });
    fireEvent.pointerMove(window, { clientY: 100 + height / 2 });
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
    expect(await screen.findByTitle(/90 dk/)).toBeTruthy();
    fireEvent.pointerUp(window, { clientY: 100 + height / 2 });
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
        endTime: '2026-10-16T07:30:00.000Z',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: base.title }));
    expect(screen.queryByText('Session editor')).toBeNull();
  });
  it('cancels a resize on Escape without writing and locks completed cards', async () => {
    mount();
    const item = await card();
    fireEvent.pointerDown(item.querySelector('[data-resize-handle]')!, {
      clientY: 100,
    });
    fireEvent.pointerMove(window, { clientY: 100 + height });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(window, { clientY: 100 + height });
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
    sessions = [{ ...base, status: 'completed' }];
    await act(async () => {
      await client.invalidateQueries();
    });
    await waitFor(() => {
      const current = screen
        .getByRole('button', { name: base.title })
        .closest('[draggable]')!;
      expect(current.getAttribute('draggable')).toBe('false');
      expect(current.querySelector('[data-resize-handle]')).toBeNull();
    });
  });
  it('keeps a failed date move open and does not automatically retry a stale write', async () => {
    const conflict = new AxiosError(
      'Conflict',
      undefined,
      undefined,
      undefined,
      response({ error: { message: 'Eski sürüm' } }),
    );
    conflict.response!.status = 409;
    vi.mocked(studySessionsAPI.updateSession)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue(response({ success: true, data: { session: base } }));
    mount();
    await card();
    fireEvent.click(
      screen.getByRole('button', { name: `${base.title}: işlemler` }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Tarihe taşı' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: '17 Ekim 2026' }),
    );
    const changed = {
      ...base,
      updatedAt: '2026-10-16T00:00:01Z',
      startTime: '2026-10-16T06:30:00Z',
      endTime: '2026-10-16T08:00:00Z',
      duration: 90,
    };
    sessions = [changed];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(
        within(dialog)
          .getByRole('button', { name: 'Taşı' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
      startTime: '2026-10-17T06:00:00.000Z',
      endTime: '2026-10-17T07:00:00.000Z',
    });
    expect(
      within(dialog).getByText('Seçilen tarih:', { exact: false }),
    ).toBeTruthy();
    expect(
      within(dialog).getByText('Taşınacak saat:', { exact: false }).textContent,
    ).toContain('09:30');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(2),
    );
    expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(changed, {
      startTime: '2026-10-17T06:30:00.000Z',
      endTime: '2026-10-17T08:00:00.000Z',
    });
  });
  it('ignores a late mutation acknowledgement after the authentication epoch changes', async () => {
    let finish!: (
      value: Awaited<ReturnType<typeof studySessionsAPI.startSession>>,
    ) => void;
    vi.mocked(studySessionsAPI.startSession).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    mount();
    await card();
    fireEvent.click(screen.getByRole('button', { name: 'Seansı başlat' }));
    const epoch = useAuthStore.getState().epoch;
    act(() => useAuthStore.setState({ epoch: epoch + 1 }));
    await act(async () =>
      finish(response({ success: true, data: { session: base } })),
    );
    expect(invalidate).not.toHaveBeenCalled();
    useAuthStore.setState({ epoch });
  });
  it('shows read errors explicitly and retries instead of rendering an empty calendar', async () => {
    vi.mocked(studySessionsAPI.getSessions).mockRejectedValueOnce(
      new Error('Offline'),
    );
    mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(
      await screen.findByRole('button', { name: base.title }),
    ).toBeTruthy();
  });
});
