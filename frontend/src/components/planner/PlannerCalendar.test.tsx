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
import { HttpError, type HttpResponse } from '../../services/httpError';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { studySessionsAPI, tagsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { StudySession } from '../../types/planner';
import PlannerCalendar, { type PlannerCalendarProps } from './PlannerCalendar';
import { usePlannerHistory } from './plannerHistory';

const DailyCalendar = (props: PlannerCalendarProps) => <PlannerCalendar {...props} mode="daily" />;
const WeeklyPlanner = (props: PlannerCalendarProps) => <PlannerCalendar {...props} mode="weekly" />;
vi.mock('../../services/api', () => ({
  studySessionsAPI: {
    getSessions: vi.fn(),
    updateSession: vi.fn(),
    startSession: vi.fn(),
    pauseSession: vi.fn(),
    completeSession: vi.fn(),
    deleteSession: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
  },
  tagsAPI: { list: vi.fn(), setSessionTags: vi.fn() },
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
const response = <T,>(data: T): HttpResponse<T> => ({
  data,
  status: 200,
  
  
  config: { url: '' },
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
  usePlannerHistory.setState({ epoch: useAuthStore.getState().epoch, past: [], future: [] });
  vi.mocked(tagsAPI.list).mockResolvedValue({ tags: [], courseTags: [], sessionTags: [] });
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
  it('keeps short adjacent sessions in separate lanes across hours and opens each action menu without writing', async () => {
    sessions = [
      {
        ...base,
        id: 1,
        title: 'Short first',
        startTime: '2026-10-16T06:59:00Z',
        endTime: '2026-10-16T07:00:00Z',
        duration: 1,
      },
      {
        ...base,
        id: 2,
        title: 'Short second',
        startTime: '2026-10-16T07:00:00Z',
        endTime: '2026-10-16T07:01:00Z',
        duration: 1,
      },
      {
        ...base,
        id: 3,
        title: 'Cancelled overlay',
        startTime: '2026-10-16T07:00:00Z',
        endTime: '2026-10-16T07:01:00Z',
        duration: 1,
        status: 'cancelled',
      },
    ];
    const before = structuredClone(sessions);
    const { container } = mount();
    const cards = await Promise.all(
      sessions.map(async (session) =>
        (
          await screen.findByRole('button', {
            name: session.title,
          })
        ).closest<HTMLElement>('[draggable]')!,
      ),
    );
    expect(new Set(cards.map((node) => node.style.left)).size).toBe(3);
    for (let index = 0; index < sessions.length; index++) {
      expect(cards[index].style.height).toBe('28px');
      expect(cards[index].querySelector('[data-resize-handle]')).toBeNull();
      fireEvent.click(
        screen.getByRole('button', {
          name: `${sessions[index].title}: işlemler`,
        }),
      );
      const menu = await screen.findByRole('dialog', {
        name: 'Seans işlemleri',
      });
      expect(
        within(menu).getByRole('button', { name: 'Saat ve süreyi değiştir' }),
      ).toBeTruthy();
      fireEvent.keyDown(menu, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    expect(
      container.querySelector<HTMLElement>('[data-calendar-header]')!.style
        .gridTemplateColumns,
    ).toContain('minmax(480px, 1fr)');
    expect(sessions).toEqual(before);
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
  });
  it('reserves space after midnight so the last minute target is not clipped', async () => {
    sessions = [
      {
        ...base,
        title: 'Last minute',
        startTime: '2026-10-16T20:59:00Z',
        endTime: '2026-10-16T21:00:00Z',
        duration: 1,
      },
    ];
    const { container } = mount();
    const item = (
      await screen.findByRole('button', { name: 'Last minute' })
    ).closest<HTMLElement>('[draggable]')!;
    expect(item.style.height).toBe('28px');
    expect(Number.parseFloat(item.style.top)).toBeCloseTo((height * 59) / 60);
    expect(
      container.querySelector<HTMLElement>('[data-calendar-header]')!
        .parentElement!.style.paddingBottom,
    ).toBe('36px');
  });
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
  it('ends a drag whose card left the screen once the mouse moves with no button held', async () => {
    mount();
    const item = await card();
    bounds(item, 100, height);
    nativeDrag(item, 'dragstart', 110);
    expect(item.className).toContain('opacity-30');
    // A move with the button still held belongs to the drag itself.
    fireEvent.mouseMove(window, { buttons: 1 });
    expect(item.className).toContain('opacity-30');
    // No dragend arrives (the card was unmounted by a week switch); the next plain move clears the drag.
    fireEvent.mouseMove(window, { buttons: 0 });
    expect(item.className).not.toContain('opacity-30');
  });
  const slot = (time: string) =>
    document.querySelector(`[data-calendar-slot="2026-10-16T${time}"]`)!;
  it('turns a press and drag on empty hours into a new session span, downwards and upwards', async () => {
    const onCreate = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <Calendar onCreateSession={onCreate} />
      </QueryClientProvider>,
    );
    await card();
    const one = slot('13:00');
    bounds(one, 200, height);
    fireEvent.pointerDown(one, { clientY: 200 + height / 2, clientX: 50, button: 0 });
    expect(document.querySelector('[data-calendar-draft]')).toBeNull();
    fireEvent.pointerMove(window, { clientY: 200 + height * 2, clientX: 50 });
    expect(document.querySelector('[data-calendar-draft]')?.textContent).toBe('13:30 – 15:00');
    fireEvent.pointerUp(window, { clientY: 200 + height * 2, clientX: 50 });
    expect(onCreate).toHaveBeenCalledWith(expect.any(Date), 13 * 60 + 30, 90);
    expect(document.querySelector('[data-calendar-draft]')).toBeNull();
    // The click that follows the release must not open a second, one-hour editor.
    fireEvent.click(one.querySelector('button')!);
    expect(onCreate).toHaveBeenCalledTimes(1);

    const two = slot('14:00');
    bounds(two, 200 + height, height);
    fireEvent.pointerDown(two, { clientY: 200 + height, clientX: 50, button: 0 });
    fireEvent.pointerMove(window, { clientY: 200 - height / 2, clientX: 50 });
    expect(document.querySelector('[data-calendar-draft]')?.textContent).toBe('12:30 – 14:15');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(window, { clientY: 200 - height / 2, clientX: 50 });
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
  it('leaves a moving touch to scrolling and never starts a span on a session card', async () => {
    const onCreate = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <Calendar onCreateSession={onCreate} />
      </QueryClientProvider>,
    );
    const item = await card();
    const one = slot('13:00');
    bounds(one, 200, height);
    // The test PointerEvent is a MouseEvent, which drops pointerType from its init.
    const touch = (target: Element | Window, name: string, clientY: number) => {
      const event = new MouseEvent(name, { bubbles: true, cancelable: true, clientX: 50, clientY });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      fireEvent(target, event);
    };
    touch(one, 'pointerdown', 210);
    touch(window, 'pointermove', 260);
    touch(window, 'pointerup', 260);
    expect(document.querySelector('[data-calendar-draft]')).toBeNull();
    fireEvent.pointerDown(item, { clientY: 110, clientX: 50, button: 0 });
    fireEvent.pointerMove(window, { clientY: 110 + height, clientX: 50 });
    fireEvent.pointerUp(window, { clientY: 110 + height, clientX: 50 });
    expect(onCreate).not.toHaveBeenCalled();
  });
  it('expands to full screen and returns on Escape', async () => {
    mount();
    await card();
    const toggle = screen.getByRole('button', { name: 'Tam ekran' });
    fireEvent.click(toggle);
    expect(document.querySelector('[data-calendar-expanded]')).not.toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('[data-calendar-expanded]')).toBeNull();
  });
  it('pulls the top edge to start earlier and takes it back with Ctrl+Z', async () => {
    vi.mocked(studySessionsAPI.updateSession).mockResolvedValue(
      response({ success: true, data: { session: base } }),
    );
    mount();
    const item = await card();
    fireEvent.pointerDown(item.querySelector('[data-resize-handle="start"]')!, { clientY: 100 });
    fireEvent.pointerMove(window, { clientY: 100 - height / 2 });
    expect(await screen.findByTitle(/90 dk/)).toBeTruthy();
    fireEvent.pointerUp(window, { clientY: 100 - height / 2 });
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
        startTime: '2026-10-16T05:30:00.000Z',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Geri al' })).toHaveProperty('disabled', false));
    const moved = { ...base, startTime: '2026-10-16T05:30:00.000Z', updatedAt: '2026-10-16T01:00:00Z' };
    vi.mocked(studySessionsAPI.getSession).mockResolvedValue(response({ success: true, data: { session: moved } }));
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(moved, {
        startTime: base.startTime,
        endTime: base.endTime,
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Yinele' })).toHaveProperty('disabled', false));
  });
  it('duplicates a session into the first free time after it', async () => {
    vi.mocked(studySessionsAPI.createSession).mockResolvedValue(
      response({ success: true, data: { session: { ...base, id: 2 } } }),
    );
    mount();
    await card();
    fireEvent.click(screen.getByRole('button', { name: `${base.title}: işlemler` }));
    fireEvent.click(await screen.findByRole('button', { name: 'Kopyala' }));
    await waitFor(() =>
      expect(studySessionsAPI.createSession).toHaveBeenCalledWith({
        title: base.title,
        startTime: '2026-10-16T07:00:00.000Z',
        endTime: '2026-10-16T08:00:00.000Z',
        sessionType: 'study',
      }),
    );
    expect(tagsAPI.setSessionTags).not.toHaveBeenCalled();
  });
  it('moves a card with a held touch to the hour under the finger', async () => {
    vi.mocked(studySessionsAPI.updateSession).mockResolvedValue(
      response({ success: true, data: { session: base } }),
    );
    mount();
    const item = await card();
    bounds(item, 100, height);
    const noon = document.querySelector('[data-calendar-slot="2026-10-16T12:00"]')!;
    bounds(noon, 400, height);
    document.elementsFromPoint = () => [noon];
    const touch = (target: Element | Window, name: string, clientY: number) => {
      const event = new MouseEvent(name, { bubbles: true, cancelable: true, clientX: 50, clientY });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      fireEvent(target, event);
    };
    touch(item, 'pointerdown', 110);
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(item.className).toContain('opacity-30');
    touch(window, 'pointermove', 410);
    touch(window, 'pointerup', 410);
    // 12:00 Istanbul is 09:00 UTC; the card keeps its one hour.
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
        startTime: '2026-10-16T09:00:00.000Z',
        endTime: '2026-10-16T10:00:00.000Z',
      }),
    );
  });
  it('opens the hours an hour before now on today and follows the fixed shortcuts', async () => {
    const onViewChange = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <Calendar onCreateSession={vi.fn()} onViewChange={onViewChange} />
      </QueryClientProvider>,
    );
    await card();
    // 05:00 UTC is 08:00 in Istanbul.
    expect(screen.getByRole('region', { name: /saatleri görmek/ }).getAttribute('data-opening-minute')).toBe('420');
    fireEvent.keyDown(document.body, { key: '3' });
    expect(onViewChange).toHaveBeenCalledWith('monthly');
    const range = () => document.querySelector('.calendar-toolbar-title p')!.textContent;
    const shown = range();
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    await waitFor(() => expect(range()).not.toBe(shown));
    fireEvent.keyDown(document.body, { key: 't' });
    await waitFor(() => expect(range()).toBe(shown));
    fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
    expect(await screen.findByRole('dialog', { name: 'Klavye kısayolları' })).toBeTruthy();
  });
  it('leaves browser full screen even when it is granted after the calendar already closed it', async () => {
    let grant: () => void = () => undefined;
    const request = vi.fn(() => new Promise<void>((resolve) => (grant = resolve)));
    const exit = vi.fn(() => Promise.resolve());
    Object.assign(document.documentElement, { requestFullscreen: request });
    Object.assign(document, { exitFullscreen: exit });
    mount();
    await card();
    fireEvent.click(screen.getByRole('button', { name: 'Tam ekran' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tam ekrandan çık' }));
    expect(exit).not.toHaveBeenCalled();
    await act(async () => grant());
    expect(request).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen');
    Reflect.deleteProperty(document, 'exitFullscreen');
  });
  it('previews a resize and commits elapsed minutes with the original version', async () => {
    vi.mocked(studySessionsAPI.updateSession).mockResolvedValue(
      response({ success: true, data: { session: base } }),
    );
    mount();
    const item = await card();
    const handle = item.querySelector('[data-resize-handle="end"]')!;
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
    fireEvent.pointerDown(item.querySelector('[data-resize-handle="end"]')!, {
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
    const conflict = new HttpError('Conflict', { status: 409, data: { error: { code: 'sessionChanged' } } });
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
  it('uses one Tab stop for available slots and arrow/Home/End navigation without writing', async () => {
    const { container } = mount();
    await card();
    const buttons = () =>
      screen.getAllByRole('button', {
        name: /seans ekle$/,
      }) as HTMLButtonElement[];
    expect(buttons().filter((button) => button.tabIndex === 0)).toHaveLength(1);
    const initial = buttons().find((button) => button.tabIndex === 0)!;
    act(() => initial.focus());
    const slot = initial
      .closest('[data-calendar-slot]')!
      .getAttribute('data-calendar-slot')!;
    fireEvent.keyDown(initial, { key: 'ArrowDown' });
    const next = document.activeElement as HTMLButtonElement;
    expect(next).not.toBe(initial);
    expect(
      next.closest('[data-calendar-slot]')!.getAttribute('data-calendar-slot'),
    ).toContain(slot.slice(0, 10));
    fireEvent.keyDown(next, { key: 'End' });
    expect(
      document.activeElement
        ?.closest('[data-calendar-slot]')
        ?.getAttribute('data-calendar-slot'),
    ).toContain('T23:00');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(
      document.activeElement
        ?.closest('[data-calendar-slot]')
        ?.getAttribute('data-calendar-slot'),
    ).toContain('T00:00');
    if (_mode === 'weekly') {
      const original = document.activeElement;
      fireEvent.keyDown(original!, { key: 'ArrowRight' });
      expect(document.activeElement).not.toBe(original);
    }
    expect(buttons().filter((button) => button.tabIndex === 0)).toHaveLength(1);
    expect(container.querySelectorAll('[data-calendar-slot]')).toHaveLength(
      _mode === 'weekly' ? 168 : 24,
    );
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
  });
  it('changes time and duration through the same versioned command without drag or pointer resize', async () => {
    vi.mocked(studySessionsAPI.updateSession).mockImplementation(
      async (_source, input) => {
        sessions = [
          {
            ...base,
            startTime: input.startTime ?? base.startTime,
            endTime: input.endTime ?? base.endTime,
            duration: 90,
          },
        ];
        return response({ success: true, data: { session: sessions[0] } });
      },
    );
    mount();
    await card();
    fireEvent.click(
      screen.getByRole('button', { name: `${base.title}: işlemler` }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Saat ve süreyi değiştir' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Başlangıç saati'), {
      target: { value: '11:15' },
    });
    fireEvent.change(within(dialog).getByLabelText('Planlanan süre (dakika)'), {
      target: { value: '90' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(base, {
        startTime: '2026-10-16T08:15:00.000Z',
        endTime: '2026-10-16T09:45:00.000Z',
      }),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: `${base.title}: işlemler` }),
      ),
    );
  });
  it('preserves a time/duration draft after 409 and retries only with an explicit new confirmation', async () => {
    const conflict = new HttpError('Conflict', { status: 409, data: { error: { code: 'sessionChanged' } } });
    vi.mocked(studySessionsAPI.updateSession)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue(response({ success: true, data: { session: base } }));
    mount();
    await card();
    fireEvent.click(
      screen.getByRole('button', { name: `${base.title}: işlemler` }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Saat ve süreyi değiştir' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Başlangıç saati'), {
      target: { value: '11:15' },
    });
    fireEvent.change(within(dialog).getByLabelText('Planlanan süre (dakika)'), {
      target: { value: '90' },
    });
    const changed = {
      ...base,
      updatedAt: '2026-10-16T00:00:01Z',
      startTime: '2026-10-16T07:00:00Z',
      endTime: '2026-10-16T09:00:00Z',
      duration: 120,
    };
    sessions = [changed];
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(
        within(dialog)
          .getByRole('button', { name: 'Taşı' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1);
    expect(
      (within(dialog).getByLabelText('Başlangıç saati') as HTMLInputElement)
        .value,
    ).toBe('11:15');
    expect(
      (
        within(dialog).getByLabelText(
          'Planlanan süre (dakika)',
        ) as HTMLInputElement
      ).value,
    ).toBe('90');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(changed, {
        startTime: '2026-10-16T08:15:00.000Z',
        endTime: '2026-10-16T09:45:00.000Z',
      }),
    );
  });
  it('rejects invalid duration without a write and preserves navigation on cancel', async () => {
    mount();
    await card();
    fireEvent.click(
      screen.getByRole('button', { name: `${base.title}: işlemler` }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Saat ve süreyi değiştir' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Planlanan süre (dakika)'), {
      target: { value: '1441' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await screen.findByRole('alert');
    expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('blocks a stale schedule write after a failed refresh and supports reading the source again', async () => {
    const conflict = new HttpError('Conflict', { status: 409, data: { error: { code: 'sessionChanged' } } });
    vi.mocked(studySessionsAPI.updateSession)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue(response({ success: true, data: { session: base } }));
    mount();
    await card();
    fireEvent.click(
      screen.getByRole('button', { name: `${base.title}: işlemler` }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Saat ve süreyi değiştir' }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Başlangıç saati'), {
      target: { value: '11:15' },
    });
    vi.mocked(studySessionsAPI.getSessions).mockRejectedValue(
      new Error('Offline'),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await screen.findByText(
      'Güncel seans okunamadı veya bu takvim aralığında bulunamadı. Kaydetmeden önce yeniden yükleyin.',
    );
    expect(
      within(dialog)
        .getByRole('button', { name: 'Taşı' })
        .hasAttribute('disabled'),
    ).toBe(true);
    const changed = { ...base, updatedAt: '2026-10-16T00:00:01Z' };
    vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(
      response({ success: true, data: { sessions: [changed] } }),
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Seansı yeniden yükle' }),
    );
    await waitFor(() =>
      expect(
        within(dialog)
          .getByRole('button', { name: 'Taşı' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(
      (within(dialog).getByLabelText('Başlangıç saati') as HTMLInputElement)
        .value,
    ).toBe('11:15');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Taşı' }));
    await waitFor(() =>
      expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(changed, {
        startTime: '2026-10-16T08:15:00.000Z',
        endTime: '2026-10-16T09:15:00.000Z',
      }),
    );
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

describe('monthly planner', () => {
  it('lists a day\'s sessions and opens a day in the daily view', async () => {
    const onViewChange = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <PlannerCalendar mode="monthly" onCreateSession={vi.fn()} onViewChange={onViewChange} />
      </QueryClientProvider>,
    );
    const day = await screen.findByRole('group', { name: /^16 Ekim 2026/ });
    expect(within(day).getByRole('button', { name: /Geometry fixture/ })).toBeTruthy();
    expect(document.querySelectorAll('[data-calendar-day]')).toHaveLength(42);
    expect(studySessionsAPI.getSessions).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: '2026-09-28', endDate: '2026-11-08' }),
    );
    fireEvent.click(within(day).getByRole('button', { name: /gününü günlük görünümde aç/ }));
    expect(onViewChange).toHaveBeenCalledWith('daily');
  });
});
