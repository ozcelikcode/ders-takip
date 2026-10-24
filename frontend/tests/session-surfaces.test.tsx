import { defaultPreferences } from '@study-tracker/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpError } from '../src/services/httpError';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import TodaysPlans from '../src/components/planner/TodaysPlans';
import CreateSessionModal from '../src/components/planner/CreateSessionModal';
import { studySessionsAPI, coursesAPI, seriesAPI } from '../src/services/api';
import type { StudySession } from '../src/types/planner';
const context = vi.hoisted(() => ({
  epoch: 1,
  preferences: { defaultPomodoroDuration: 25 },
}));
vi.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(() => ({ user: { id: '1' } }), {
    getState: () => context,
  }),
}));
vi.mock('../src/store/userPreferencesStore', async () => {
  const { defaultPreferences } = await import('@study-tracker/contracts');
  return {
    useUserPreferencesStore: (
      selector: (state: { preferences: typeof defaultPreferences }) => unknown,
    ) =>
      selector({
        preferences: { ...defaultPreferences, ...context.preferences },
      }),
  };
});
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return {
    useAccountQueryKeys: () => accountQueryKeys('1', 'Europe/Istanbul'),
  };
});
vi.mock('../src/hooks/useCurrentDateKey', () => ({
  useCurrentDateKey: () => '2030-01-01',
}));
vi.mock('../src/services/api', () => ({
  studySessionsAPI: {
    getSessions: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    startSession: vi.fn(),
    pauseSession: vi.fn(),
    completeSession: vi.fn(),
    deleteSession: vi.fn(),
  },
  coursesAPI: { getCourses: vi.fn() },
  seriesAPI: { list: vi.fn(), create: vi.fn(), update: vi.fn(), stop: vi.fn() },
  tagsAPI: { list: vi.fn(async () => ({ tags: [], courseTags: [], sessionTags: [] })), setSessionTags: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../src/components/planner/PomodoroModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Shared clock</div> : null,
}));
function response<T>(data: T) {
  return {
    data: { success: true, data },
    status: 200,
    
    
    config: { url: '' },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const session: StudySession = {
  id: 42,
  userId: 1,
  title: 'Fixture session',
  startTime: '2030-01-01T06:00:00Z',
  endTime: '2030-01-01T07:00:00Z',
  duration: 60,
  status: 'in_progress',
  sessionType: 'study',
  description: 'Preserve details',
  createdAt: '2026-01-01T09:00:00Z',
  updatedAt: '2026-01-01T09:00:00Z',
};
const conflict = () =>
  new HttpError('Conflict', {
    status: 409,
    data: {
      success: false,
      error: { code: 'sessionChanged' },
    },
  });
function mount(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  return {
    ...view,
    client,
    wrap: (next: React.ReactNode) => (
      <QueryClientProvider client={client}>{next}</QueryClientProvider>
    ),
  };
}
async function expand() {
  await screen.findByText('0/1 tamamlandı');
  fireEvent.click(screen.getByRole('button', { name: /Bugünün planları/ }));
  await screen.findByText('Fixture session');
}
async function editable(onClose = vi.fn(), source = session) {
  const view = mount(
    <CreateSessionModal isOpen editSession={source} onClose={onClose} />,
  );
  await screen.findByLabelText('Özel Başlık *');
  return { ...view, onClose };
}
const title = () => screen.getByLabelText('Özel Başlık *');
const submit = () =>
  fireEvent.submit(document.getElementById('create-session-form')!);
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  context.epoch = 1;
  context.preferences.defaultPomodoroDuration = 25;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(
    response({ sessions: [session] }),
  );
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.updateSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.startSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.pauseSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.completeSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.createSession).mockResolvedValue(
    response({ session }),
  );
  vi.mocked(studySessionsAPI.deleteSession).mockResolvedValue(
    response(undefined),
  );
  vi.mocked(coursesAPI.getCourses).mockResolvedValue(response({ courses: [] }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
it('keeps a failed daily confirmation open, then retries with a refreshed snapshot after conflict', async () => {
  vi.mocked(studySessionsAPI.pauseSession)
    .mockRejectedValueOnce(conflict())
    .mockResolvedValue(response({ session }));
  let calls = 0;
  const latest = { ...session, updatedAt: '2026-01-02T09:00:00Z' };
  vi.mocked(studySessionsAPI.getSessions).mockImplementation(async () =>
    response({ sessions: [++calls > 1 ? latest : session] }),
  );
  mount(<TodaysPlans />);
  await expand();
  fireEvent.click(
    screen.getByRole('button', { name: 'Seansı duraklat: Fixture session' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await screen.findByText('Kayıt başka bir işlemde değiştirildi. Güncel veriyi yükleyip tekrar deneyin');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(studySessionsAPI.pauseSession).toHaveBeenCalledTimes(1);
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Onayla' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(studySessionsAPI.pauseSession).toHaveBeenLastCalledWith(latest);
});
it('blocks daily duplicate writes, editing and dismissal while a command is pending', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof studySessionsAPI.completeSession>>>();
  vi.mocked(studySessionsAPI.completeSession).mockReturnValue(pending.promise);
  mount(<TodaysPlans />);
  await expand();
  fireEvent.click(
    screen.getByRole('button', { name: 'Seansı tamamla: Fixture session' }),
  );
  const confirm = screen.getByRole('button', { name: 'Onayla' });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  expect(studySessionsAPI.completeSession).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(() => pending.resolve(response({ session })));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('opens the shared clock from a paused daily Pomodoro without starting a second timer', async () => {
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(
    response({
      sessions: [{ ...session, status: 'paused', sessionType: 'pomodoro' }],
    }),
  );
  mount(<TodaysPlans />);
  await expand();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Fixture session: Pomodoro sayacını aç',
    }),
  );
  await screen.findByText('Shared clock');
  expect(studySessionsAPI.startSession).not.toHaveBeenCalled();
});
it('reopens terminal daily sessions explicitly without starting work or discarding history', async () => {
  vi.mocked(studySessionsAPI.getSessions).mockResolvedValue(
    response({ sessions: [{ ...session, status: 'cancelled' }] }),
  );
  mount(<TodaysPlans />);
  await expand();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Seansı yeniden planla: Fixture session',
    }),
  );
  expect(
    screen.getByText(/Notlar ve ölçülen çalışma geçmişi korunur/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await waitFor(() =>
    expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
      { status: 'planned' },
    ),
  );
  expect(studySessionsAPI.startSession).not.toHaveBeenCalled();
});
it('separates a daily read failure from an empty list and retries', async () => {
  vi.mocked(studySessionsAPI.getSessions)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(response({ sessions: [] }));
  mount(<TodaysPlans />);
  await screen.findByText('Bugünün planları alınamadı.');
  expect(screen.queryByText('0/0 tamamlandı')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByText('0/0 tamamlandı');
  fireEvent.click(screen.getByRole('button', { name: /Bugünün planları/ }));
  await screen.findByText('Bugün için planlanmış seans yok.');
});
it('ignores a late daily command after account change', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof studySessionsAPI.pauseSession>>>();
  vi.mocked(studySessionsAPI.pauseSession).mockReturnValue(pending.promise);
  const { client } = mount(<TodaysPlans />);
  await expand();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(
    screen.getByRole('button', { name: 'Seansı duraklat: Fixture session' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  context.epoch++;
  await act(() => pending.resolve(response({ session })));
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('does not query the course catalog for a closed editor', () => {
  mount(<CreateSessionModal isOpen={false} onClose={vi.fn()} />);
  expect(coursesAPI.getCourses).not.toHaveBeenCalled();
});
it('locks the editor and prevents early close or duplicate saves until acknowledgement', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof studySessionsAPI.updateSession>>>();
  vi.mocked(studySessionsAPI.updateSession).mockReturnValue(pending.promise);
  const { onClose } = await editable();
  fireEvent.change(title(), { target: { value: 'Edited title' } });
  act(() => {
    submit();
    submit();
  });
  await waitFor(() =>
    expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1),
  );
  expect(title().matches(':disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  await act(() => pending.resolve(response({ session })));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
it('keeps rejected editor input and retries a version conflict with the refreshed snapshot', async () => {
  const latest = { ...session, updatedAt: '2026-01-02T09:00:00Z' };
  vi.mocked(studySessionsAPI.updateSession)
    .mockRejectedValueOnce(conflict())
    .mockResolvedValue(response({ session: latest }));
  vi.mocked(studySessionsAPI.getSession).mockResolvedValue(
    response({ session: latest }),
  );
  const { onClose } = await editable();
  fireEvent.change(title(), { target: { value: 'Draft title' } });
  submit();
  await screen.findByText('Kayıt başka bir işlemde değiştirildi. Güncel veriyi yükleyip tekrar deneyin');
  expect((title() as HTMLInputElement).value).toBe('Draft title');
  expect(onClose).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Güncelle' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  submit();
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(studySessionsAPI.updateSession).toHaveBeenLastCalledWith(
    latest,
    expect.objectContaining({ title: 'Draft title' }),
  );
  expect(studySessionsAPI.getSession).toHaveBeenCalledWith('42');
});
it('blocks stale writes if refreshing the conflicting session fails and supports explicit read retry', async () => {
  vi.mocked(studySessionsAPI.updateSession).mockRejectedValueOnce(conflict());
  vi.mocked(studySessionsAPI.getSession)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(
      response({ session: { ...session, updatedAt: '2026-01-02T09:00:00Z' } }),
    );
  await editable();
  submit();
  await screen.findByText('Güncel seans okunmadan işlem yapılamaz.');
  expect(
    (screen.getByRole('button', { name: 'Güncelle' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole('button', { name: 'Güncel seansı yeniden yükle' }),
  );
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Güncelle' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1);
});
it('retains the editor under a nested delete confirmation, with an acknowledged delete and inline retry', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof studySessionsAPI.deleteSession>>>();
  vi.mocked(studySessionsAPI.deleteSession)
    .mockRejectedValueOnce(conflict())
    .mockReturnValueOnce(pending.promise);
  const { onClose } = await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await screen.findByText('Kayıt başka bir işlemde değiştirildi. Güncel veriyi yükleyip tekrar deneyin');
  expect(onClose).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Onayla' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  const confirm = screen.getByRole('button', { name: 'Onayla' });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  expect(studySessionsAPI.deleteSession).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  await act(() => pending.resolve(response(undefined)));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
it('closes only the delete confirmation on Escape and returns focus to its trigger', async () => {
  const { onClose } = await editable();
  fireEvent.click(screen.getByRole('button', { name: 'Sil' }));
  await screen.findByRole('dialog', { name: 'Seansı sil' });
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Seansı sil' })).toBeNull(),
  );
  expect(
    screen.getByRole('dialog', { name: 'Seansı düzenle' }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Sil' }),
    ),
  );
  expect(onClose).not.toHaveBeenCalled();
});
it('does not reset an edited draft when parent date, session or preference snapshots change', async () => {
  const { rerender, wrap, onClose } = await editable();
  fireEvent.change(title(), { target: { value: 'Keep draft' } });
  context.preferences.defaultPomodoroDuration = 35;
  rerender(
    wrap(
      <CreateSessionModal
        isOpen
        editSession={{ ...session, title: 'Remote title' }}
        selectedDate={new Date('2031-01-01')}
        onClose={onClose}
      />,
    ),
  );
  expect((title() as HTMLInputElement).value).toBe('Keep draft');
});
it('keeps current inactive course and stored title on a metadata edit, and supports clearing description', async () => {
  vi.mocked(coursesAPI.getCourses).mockResolvedValue(
    response({
      courses: [{ id: 9, name: 'Archived course', isActive: false }],
    }) as unknown as Awaited<ReturnType<typeof coursesAPI.getCourses>>,
  );
  const original = {
    ...session,
    courseId: 9,
    title: 'Stored historical title',
  };
  const onClose = vi.fn();
  mount(<CreateSessionModal isOpen editSession={original} onClose={onClose} />);
  await screen.findByLabelText('Ders seçimi *');
  await screen.findByRole('option', { name: 'Archived course' });
  fireEvent.change(screen.getByLabelText('Açıklama'), {
    target: { value: '' },
  });
  submit();
  await waitFor(() =>
    expect(studySessionsAPI.updateSession).toHaveBeenCalledWith(
      original,
      expect.objectContaining({
        title: 'Stored historical title',
        courseId: 9,
        description: '',
      }),
    ),
  );
  expect(coursesAPI.getCourses).toHaveBeenCalledWith({ isActive: 'all' });
});
it('ignores editor completion after unmount or account replacement', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof studySessionsAPI.updateSession>>>();
  vi.mocked(studySessionsAPI.updateSession).mockReturnValue(pending.promise);
  const { onClose, client, unmount } = await editable();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  submit();
  await waitFor(() =>
    expect(studySessionsAPI.updateSession).toHaveBeenCalledTimes(1),
  );
  context.epoch++;
  unmount();
  await act(() => pending.resolve(response({ session })));
  expect(onClose).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('keeps personal Pomodoro defaults for newly opened editors', async () => {
  context.preferences.defaultPomodoroDuration = 35;
  mount(<CreateSessionModal isOpen onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Özel' }));
  fireEvent.change(await screen.findByLabelText('Özel Başlık *'), {
    target: { value: 'Custom timer' },
  });
  fireEvent.change(screen.getByLabelText('Seans türü *'), {
    target: { value: 'pomodoro' },
  });
  expect(defaultPreferences.defaultPomodoroDuration).toBe(25);
  expect(screen.getByDisplayValue('35')).toBeTruthy();
});

it.each([1, 1.5, 1440])('saves a %s-minute editor interval using the shared API duration bounds', async (minutes) => {
  const { onClose } = await editable();
  fireEvent.change(screen.getByLabelText('Süre (dakika) *'), { target: { value: String(minutes) } });
  submit();
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  const input = vi.mocked(studySessionsAPI.updateSession).mock.calls[0]?.[1];
  expect(Date.parse(input?.endTime ?? '') - Date.parse(input?.startTime ?? '')).toBe(minutes * 60_000);
});
it.each([0, 1441])('rejects an out-of-contract %s-minute interval before sending it', async (minutes) => {
  await editable();
  fireEvent.change(screen.getByLabelText('Süre (dakika) *'), { target: { value: String(minutes) } });
  submit();
  await screen.findByText(minutes === 0 ? 'Minimum 1 dakika' : 'Maximum 24 saat');
  expect(studySessionsAPI.updateSession).not.toHaveBeenCalled();
});

const routine = {
  id: 3, title: 'Guitar', description: null, courseId: null, topicId: null, sessionType: 'study' as const, color: '#3B82F6',
  pomodoroSettings: null, weekdays: [1, 3], startTime: '19:00', durationMinutes: 60, startsOn: '2031-01-06', endsOn: null,
  timezone: 'Europe/Istanbul', updatedAt: '2031-01-01T00:00:00.000Z',
};

it('creates a weekly routine from the session form and says which days another session already holds', async () => {
  vi.mocked(seriesAPI.create).mockResolvedValue({ series: routine, skippedDates: ['2031-01-08'] });
  const onClose = vi.fn();
  mount(<CreateSessionModal isOpen selectedDate={new Date(Date.UTC(2031, 0, 6))} selectedHour={19} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Özel' }));
  fireEvent.change(await screen.findByLabelText('Özel Başlık *'), { target: { value: 'Guitar' } });
  expect(screen.queryByRole('group', { name: 'Tekrar günleri' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Her hafta tekrarla' }));
  const days = screen.getByRole('group', { name: 'Tekrar günleri' });
  // The routine starts on the chosen day's weekday; more days can be added.
  expect(days.querySelector('[aria-pressed="true"]')?.textContent).toBe('Pzt');
  fireEvent.click(screen.getByRole('button', { name: 'Çar' }));
  fireEvent.change(screen.getByLabelText('Bitiş tarihi (isteğe bağlı)'), { target: { value: '2031-02-28' } });
  submit();
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(seriesAPI.create).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Guitar', weekdays: [1, 3], startTime: '19:00', durationMinutes: 60, startsOn: '2031-01-06', endsOn: '2031-02-28', sessionType: 'study',
  }));
  expect(studySessionsAPI.createSession).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith('1 gün başka bir seans ile çakıştığı için atlandı.');
  expect(toast.success).toHaveBeenCalledWith('Rutin oluşturuldu.');
});

it('edits a routine as a whole and ends it only after confirmation', async () => {
  vi.mocked(seriesAPI.update).mockResolvedValue({ series: routine, skippedDates: [] });
  const onClose = vi.fn();
  mount(<CreateSessionModal isOpen editSeries={routine} onClose={onClose} />);
  expect(await screen.findByRole('heading', { name: 'Rutini düzenle' })).toBeTruthy();
  expect((screen.getByLabelText('Özel Başlık *') as HTMLInputElement).value).toBe('Guitar');
  expect(screen.queryByRole('checkbox', { name: 'Her hafta tekrarla' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Süre (dakika) *'), { target: { value: '45' } });
  submit();
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(seriesAPI.update).toHaveBeenCalledWith(routine, expect.objectContaining({ durationMinutes: 45, weekdays: [1, 3] }));
  cleanup();

  vi.mocked(seriesAPI.stop).mockResolvedValue(undefined);
  const closed = vi.fn();
  mount(<CreateSessionModal isOpen editSeries={routine} onClose={closed} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Rutini bitir' }));
  expect(seriesAPI.stop).not.toHaveBeenCalled();
  const confirm = await screen.findByRole('dialog', { name: 'Rutini bitir' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Rutini bitir' }));
  await waitFor(() => expect(seriesAPI.stop).toHaveBeenCalledWith(routine));
  await waitFor(() => expect(closed).toHaveBeenCalledTimes(1));
});

it('tells the person that changing a routine session affects only that session', async () => {
  await editable(vi.fn(), { ...session, seriesId: 3, seriesDate: '2030-01-01' });
  expect(screen.getByText(/bir rutinin parçası/)).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: 'Her hafta tekrarla' })).toBeNull();
});
