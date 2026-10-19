import type { ReactNode } from 'react';
import { AxiosError, type AxiosResponse } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { categoriesAPI, coursesAPI, topicsAPI } from '../../services/api';
import { canManageCourse } from '../../lib/catalogAccess';
import type { ApiResponse } from '../../types/api';
import type { CatalogCourse, CatalogTopic } from '../../types/catalog';
import CourseEditorModal from '../modals/CourseEditorModal';
import TopicEditorModal from '../modals/TopicEditorModal';
import CatalogDeleteDialog from './CatalogDeleteDialog';

const auth = vi.hoisted(() => ({ epoch: 0, user: { id: 1, role: 'student' } }));
vi.mock('../../store/authStore', () => ({
  useAuthStore: Object.assign(() => auth, { getState: () => auth }),
}));
vi.mock('../../hooks/useAccountQueryKeys', () => ({
  useAccountQueryKeys: () => ({
    catalog: (...parts: unknown[]) => ['account', '1', 'catalog', ...parts],
    sessions: () => ['account', '1', 'sessions'],
    resource: (...parts: unknown[]) => ['account', '1', ...parts],
  }),
}));
vi.mock('../../services/api', () => ({
  categoriesAPI: { getCategories: vi.fn() },
  coursesAPI: {
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
  },
  topicsAPI: {
    createTopic: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const course: CatalogCourse = {
  id: 10,
  name: 'Matematik',
  categoryId: 2,
  description: null,
  color: '#123456',
  icon: 'LegacyIcon',
  order: 4,
  isActive: true,
  isGlobal: false,
  userId: 1,
};
const topic: CatalogTopic = {
  id: 20,
  name: 'Türev',
  description: 'Preserve notes',
  estimatedTime: 40,
  difficulty: 'Zor',
  order: 3,
  updatedAt: '2026-10-16T09:00:00.000Z',
};
const ok = { data: { success: true } } as AxiosResponse<ApiResponse<never>>;
const failed = () =>
  new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    ...ok,
    status: 409,
    data: { success: false, error: { message: 'Bu ad zaten kullanılıyor.' } },
  });
function mount(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  return client;
}
beforeEach(() => {
  auth.epoch = 0;
  auth.user = { id: 1, role: 'student' };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue({
    data: {
      success: true,
      data: { categories: [{ id: 2, name: 'TYT', color: '#123456', userId: null }] },
    },
  } as unknown as Awaited<ReturnType<typeof categoriesAPI.getCategories>>);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('matches owner, global, missing-owner and administrator access rules', () => {
  expect(canManageCourse(course, { id: '1', role: 'student' })).toBe(true);
  expect(canManageCourse(course, { id: 2, role: 'student' })).toBe(false);
  expect(canManageCourse({ ...course, isGlobal: true }, auth.user)).toBe(false);
  expect(canManageCourse({ isGlobal: false }, auth.user)).toBe(false);
  expect(
    canManageCourse({ ...course, isGlobal: true }, { id: 2, role: 'admin' }),
  ).toBe(true);
  expect(canManageCourse(course, null)).toBe(false);
});
it('validates shared create rules and omits privileged fields for a student', async () => {
  vi.mocked(coursesAPI.createCourse).mockResolvedValue(ok);
  const close = vi.fn();
  mount(<CourseEditorModal isOpen onClose={close} />);
  await screen.findByRole('option', { name: 'TYT' });
  fireEvent.change(screen.getByLabelText('Kategori'), {
    target: { value: '2' },
  });
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: '   ' },
  });
  fireEvent.change(screen.getByLabelText('Sıra'), { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(coursesAPI.createCourse).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Ders adı').getAttribute('aria-invalid')).toBe(
    'true',
  );
  expect(screen.getByLabelText('Sıra').getAttribute('aria-invalid')).toBe(
    'true',
  );
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: ' Yeni ders ' },
  });
  fireEvent.change(screen.getByLabelText('Sıra'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(coursesAPI.createCourse).toHaveBeenCalledWith({
    name: 'Yeni ders',
    categoryId: 2,
    description: '',
    color: '#52525b',
    icon: 'BookOpen',
    order: 2,
  });
  expect(screen.queryByLabelText('Tüm kullanıcılara açık')).toBeNull();
});
it('sends only changed course fields, retains an unknown icon and revalidates all affected resources', async () => {
  vi.mocked(coursesAPI.updateCourse).mockResolvedValue(ok);
  const close = vi.fn();
  const client = mount(
    <CourseEditorModal isOpen course={course} onClose={close} />,
  );
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await screen.findByRole('option', { name: 'TYT' });
  expect((screen.getByLabelText('Simge') as HTMLSelectElement).value).toBe(
    'LegacyIcon',
  );
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: 'Geometri' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(coursesAPI.updateCourse).toHaveBeenCalledWith('10', {
    name: 'Geometri',
  });
  for (const resource of ['catalog', 'sessions', 'topic-progress'])
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['account', '1', resource],
    });
});
it('keeps course input after a server rejection and retries only explicitly', async () => {
  vi.mocked(coursesAPI.updateCourse)
    .mockRejectedValueOnce(failed())
    .mockResolvedValueOnce(ok);
  const close = vi.fn();
  mount(<CourseEditorModal isOpen course={course} onClose={close} />);
  await screen.findByRole('option', { name: 'TYT' });
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: 'Çakışan ad' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Bu ad zaten kullanılıyor.',
  );
  expect(close).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Ders adı') as HTMLInputElement).value).toBe(
    'Çakışan ad',
  );
  expect(coursesAPI.updateCourse).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: 'Benzersiz ad' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(coursesAPI.updateCourse).toHaveBeenLastCalledWith('10', {
    name: 'Benzersiz ad',
  });
});
it('keeps categories failures visible, disables writes and offers a read retry', async () => {
  vi.mocked(categoriesAPI.getCategories).mockRejectedValueOnce(
    new Error('Offline'),
  );
  mount(<CourseEditorModal isOpen onClose={vi.fn()} />);
  await screen.findByRole('alert');
  expect(
    (screen.getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByRole('option', { name: 'TYT' });
  expect(
    (screen.getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
it('reuses the course editor for admin creation with explicit global and active controls', async () => {
  auth.user.role = 'admin';
  vi.mocked(coursesAPI.createCourse).mockResolvedValue(ok);
  mount(<CourseEditorModal isOpen defaultGlobal onClose={vi.fn()} />);
  await screen.findByRole('option', { name: 'TYT' });
  expect(
    (screen.getByLabelText('Tüm kullanıcılara açık') as HTMLInputElement)
      .checked,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText('Ders adı'), {
    target: { value: 'Ortak ders' },
  });
  fireEvent.change(screen.getByLabelText('Kategori'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() =>
    expect(coursesAPI.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ isGlobal: true, isActive: true }),
    ),
  );
});
it('does not render a student editor for global or foreign catalogs', () => {
  mount(
    <>
      <CourseEditorModal
        isOpen
        course={{ ...course, isGlobal: true }}
        onClose={vi.fn()}
      />
      <TopicEditorModal
        isOpen
        course={{ ...course, userId: 2 }}
        topic={topic}
        onClose={vi.fn()}
      />
    </>,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(categoriesAPI.getCategories).not.toHaveBeenCalled();
});
it('sends a partial topic update without overwriting its course, order or archive state', async () => {
  vi.mocked(topicsAPI.updateTopic).mockResolvedValue(ok);
  const close = vi.fn();
  mount(
    <TopicEditorModal
      isOpen
      course={course}
      topic={{ ...topic, isActive: false }}
      onClose={close}
    />,
  );
  fireEvent.change(screen.getByLabelText('Tahmini süre (dk)'), {
    target: { value: '10.5' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(topicsAPI.updateTopic).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Tahmini süre (dk)'), {
    target: { value: '55' },
  });
  fireEvent.change(screen.getByLabelText('Açıklama'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(topicsAPI.updateTopic).toHaveBeenCalledWith('20', {
    description: '',
    estimatedTime: 55,
  });
});
it('does not send a no-op edit', () => {
  const close = vi.fn();
  mount(
    <TopicEditorModal isOpen course={course} topic={topic} onClose={close} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(close).toHaveBeenCalledTimes(1);
  expect(topicsAPI.updateTopic).not.toHaveBeenCalled();
});
it('blocks duplicate topic creation and dismissal until acknowledgement', async () => {
  let finish!: (value: typeof ok) => void;
  vi.mocked(topicsAPI.createTopic).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const close = vi.fn();
  mount(<TopicEditorModal isOpen course={course} onClose={close} />);
  fireEvent.change(screen.getByLabelText('Konu adı'), {
    target: { value: 'Limit' },
  });
  const button = screen.getByRole('button', { name: 'Kaydet' });
  act(() => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(topicsAPI.createTopic).toHaveBeenCalledTimes(1);
  expect(topicsAPI.createTopic).toHaveBeenCalledWith({
    name: 'Limit',
    courseId: 10,
    description: '',
    estimatedTime: 30,
    difficulty: 'Orta',
  });
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  await act(async () => finish(ok));
  expect(close).toHaveBeenCalledTimes(1);
});
it('ignores an acknowledgement from a previous account without callbacks, cache work or success toast', async () => {
  let finish!: (value: typeof ok) => void;
  vi.mocked(topicsAPI.updateTopic).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const close = vi.fn();
  const client = mount(
    <TopicEditorModal isOpen course={course} topic={topic} onClose={close} />,
  );
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.change(screen.getByLabelText('Konu adı'), {
    target: { value: 'Türev II' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  auth.epoch++;
  await act(async () => finish(ok));
  expect(close).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('keeps archive confirmation open on failure and states its reversible history policy', async () => {
  vi.mocked(topicsAPI.deleteTopic)
    .mockRejectedValueOnce(failed())
    .mockResolvedValueOnce(ok);
  const close = vi.fn();
  mount(
    <CatalogDeleteDialog
      target={{ kind: 'topic', id: 20, name: 'Türev' }}
      onClose={close}
    />,
  );
  expect(
    screen.getByText(/İlerleme kayıtları ve çalışma geçmişi korunacak/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Arşivle' }));
  await screen.findByRole('alert');
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Arşivle' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(topicsAPI.deleteTopic).toHaveBeenCalledWith('20');
});
it('explains permanent course deletion separately from preserved measured history', async () => {
  vi.mocked(coursesAPI.deleteCourse).mockResolvedValue(ok);
  const close = vi.fn();
  const deleted = vi.fn();
  mount(
    <CatalogDeleteDialog
      target={{ kind: 'course', id: 10, name: 'Matematik' }}
      onClose={close}
      onDeleted={deleted}
    />,
  );
  expect(
    screen.getByText(/konu ilerleme kayıtları kalıcı olarak silinecek/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Dersi sil' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(coursesAPI.deleteCourse).toHaveBeenCalledWith('10');
  expect(deleted).toHaveBeenCalledTimes(1);
});

it('preserves an existing category when the active category list no longer contains it', async () => {
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue({
    data: { success: true, data: { categories: [] } },
  } as unknown as Awaited<ReturnType<typeof categoriesAPI.getCategories>>);
  vi.mocked(coursesAPI.updateCourse).mockResolvedValue(ok);
  mount(
    <CourseEditorModal
      isOpen
      course={{
        ...course,
        category: { id: 2, name: 'Previous category', color: '#123456' },
      }}
      onClose={vi.fn()}
    />,
  );
  await screen.findByRole('option', { name: 'Previous category' });
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Kaydet' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.change(screen.getByLabelText('Açıklama'), {
    target: { value: 'Updated description' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() =>
    expect(coursesAPI.updateCourse).toHaveBeenCalledWith('10', {
      description: 'Updated description',
    }),
  );
});
it('does not overwrite a draft when the catalog refetches while editing', async () => {
  vi.mocked(coursesAPI.updateCourse).mockResolvedValue(ok);
  const close = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const ui = (value: CatalogCourse) => (
    <QueryClientProvider client={client}>
      <CourseEditorModal isOpen course={value} onClose={close} />
    </QueryClientProvider>
  );
  const view = render(ui(course));
  await screen.findByRole('option', { name: 'TYT' });
  fireEvent.change(screen.getByLabelText('Açıklama'), {
    target: { value: 'Unsaved draft' },
  });
  view.rerender(ui({ ...course, name: 'Externally changed name' }));
  expect((screen.getByLabelText('Açıklama') as HTMLTextAreaElement).value).toBe(
    'Unsaved draft',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(coursesAPI.updateCourse).toHaveBeenCalledWith('10', {
    description: 'Unsaved draft',
  });
});
it('offers personal categories only for the owner\'s own non-shared records', async () => {
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue({
    data: {
      success: true,
      data: {
        categories: [
          { id: 2, name: 'TYT', color: '#123456', userId: null },
          { id: 3, name: 'Kendi', color: '#123456', userId: 1 },
          { id: 4, name: 'Başkası', color: '#123456', userId: 9 },
        ],
      },
    },
  } as unknown as Awaited<ReturnType<typeof categoriesAPI.getCategories>>);
  mount(<CourseEditorModal isOpen onClose={vi.fn()} />);
  await screen.findByRole('option', { name: 'Kendi (kişisel)' });
  expect(screen.queryByRole('option', { name: /Başkası/ })).toBeNull();
  cleanup();
  auth.user = { id: 1, role: 'admin' };
  mount(<CourseEditorModal isOpen onClose={vi.fn()} defaultGlobal />);
  await screen.findByRole('option', { name: 'TYT' });
  expect(screen.queryByRole('option', { name: /Kendi/ })).toBeNull();
  fireEvent.click(screen.getByLabelText('Tüm kullanıcılara açık'));
  fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: '3' } });
  fireEvent.click(screen.getByLabelText('Tüm kullanıcılara açık'));
  expect(screen.queryByRole('option', { name: /Kendi/ })).toBeNull();
  expect((screen.getByLabelText('Kategori') as HTMLSelectElement).value).toBe('');
});
