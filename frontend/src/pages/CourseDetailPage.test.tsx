import type { ReactNode } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { coursesAPI, topicsAPI } from '../services/api';
import CourseDetailPage from './CourseDetailPage';

const dnd = vi.hoisted(() => ({
  onDragEnd: (_result: DropResult) => {},
  disabled: false,
}));
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: typeof dnd.onDragEnd;
  }) => {
    dnd.onDragEnd = onDragEnd;
    return children;
  },
  Droppable: ({
    children,
    isDropDisabled,
  }: {
    children: (provided: object) => ReactNode;
    isDropDisabled: boolean;
  }) => {
    dnd.disabled = isDropDisabled;
    return children({
      droppableProps: {},
      innerRef: () => {},
      placeholder: null,
    });
  },
  Draggable: ({
    children,
  }: {
    children: (provided: object, snapshot: object) => ReactNode;
  }) =>
    children(
      { draggableProps: {}, dragHandleProps: {}, innerRef: () => {} },
      { isDragging: false },
    ),
}));
vi.mock('../services/api', () => ({
  coursesAPI: { getCourse: vi.fn(), getCourseTopics: vi.fn() },
  topicsAPI: {
    reorderTopics: vi.fn(),
    getTopicProgress: vi.fn(),
    setTopicProgress: vi.fn(),
    updateTopic: vi.fn(),
  },
}));
vi.mock('../components/modals/TopicEditorModal', () => ({
  default: () => null,
}));
// The weekly goal panel has its own tests (tests/course-goals.test.tsx).
vi.mock('../components/goals/CourseGoalPanel', () => ({
  default: () => null,
}));
vi.mock('../components/tags/CourseTagsPanel', () => ({
  default: () => null,
}));
vi.mock('../hooks/useAccountQueryKeys', () => ({
  useAccountQueryKeys: () => ({
    catalog: (...parts: unknown[]) => ['account', '1', 'catalog', ...parts],
    sessions: (...parts: unknown[]) => ['account', '1', 'sessions', ...parts],
    resource: (...parts: unknown[]) => ['account', '1', 'resource', ...parts],
  }),
}));
vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => ({ user: { id: 1, role: 'student' } }), {
    getState: () => ({ epoch: 0, user: { id: 1, role: 'student' } }),
  }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const topics = [1, 2, 3].map((id) => ({
  id,
  name: `Topic ${id}`,
  description: '',
  estimatedTime: 30,
  difficulty: 'Kolay',
  order: id,
  updatedAt: '2026-10-16T09:00:00.001Z',
}));
const course = {
  id: 10,
  name: 'Fixture course',
  userId: 1,
  isGlobal: false,
  color: '#123456',
  icon: 'BookOpen',
  topics,
};
const response = (value = course) =>
  ({ data: { success: true, data: { course: value } } }) as Awaited<
    ReturnType<typeof coursesAPI.getCourse>
  >;
const drop = { source: { index: 0 }, destination: { index: 2 } } as DropResult;
async function mount() {
  vi.mocked(coursesAPI.getCourse).mockResolvedValue(response());
  vi.mocked(topicsAPI.getTopicProgress).mockResolvedValue({
    data: {
      success: true,
      data: { progress: [{ topicId: 2, courseId: 10, status: 'completed' }] },
    },
  } as Awaited<ReturnType<typeof topicsAPI.getTopicProgress>>);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={['/courses/10']}
      >
        <Routes>
          <Route path="/courses/:id" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('Fixture course');
  await waitFor(() => expect(dnd.disabled).toBe(false));
  return client;
}
it('sends the original full snapshot, blocks repeated drags and waits for server acknowledgement', async () => {
  let acknowledge!: (
    value: Awaited<ReturnType<typeof topicsAPI.reorderTopics>>,
  ) => void;
  vi.mocked(topicsAPI.reorderTopics).mockImplementation(
    () =>
      new Promise((resolve) => {
        acknowledge = resolve;
      }),
  );
  const client = await mount();
  act(() => dnd.onDragEnd(drop));
  await waitFor(() =>
    expect(topicsAPI.reorderTopics).toHaveBeenCalledWith('10', {
      topicOrders: [
        { id: 2, order: 1 },
        { id: 3, order: 2 },
        { id: 1, order: 3 },
      ],
      expectedTopics: topics.map(({ id, updatedAt }) => ({ id, updatedAt })),
    }),
  );
  await waitFor(() => expect(dnd.disabled).toBe(true));
  act(() => dnd.onDragEnd(drop));
  expect(topicsAPI.reorderTopics).toHaveBeenCalledTimes(1);
  expect(
    client
      .getQueryData<ReturnType<typeof response>>([
        'account',
        '1',
        'catalog',
        'course',
        '10',
        { includeTopics: true },
      ])
      ?.data.data?.course.topics?.map((topic: { id: number }) => topic.id),
  ).toEqual([1, 2, 3]);
  await act(async () =>
    acknowledge({
      data: { success: true, data: { topics: [] } },
      status: 200,
      
      
      config: { url: '' },
    }),
  );
  await waitFor(() => expect(coursesAPI.getCourse).toHaveBeenCalledTimes(2));
});
it('disables reorder for filtered, descending and alternate sort views', async () => {
  await mount();
  const [filter, sort] = screen.getAllByRole('combobox');
  fireEvent.change(filter, { target: { value: 'Kolay' } });
  expect(dnd.disabled).toBe(true);
  act(() => dnd.onDragEnd(drop));
  expect(topicsAPI.reorderTopics).not.toHaveBeenCalled();
  fireEvent.change(filter, { target: { value: 'all' } });
  expect(dnd.disabled).toBe(false);
  fireEvent.change(sort, { target: { value: 'name' } });
  expect(dnd.disabled).toBe(true);
  fireEvent.change(sort, { target: { value: 'order' } });
  expect(dnd.disabled).toBe(false);
  const sortButton = screen.getByRole('button', {
    name: 'Sıralama yönünü değiştir',
  });
  fireEvent.click(sortButton);
  expect(dnd.disabled).toBe(true);
});
it('refetches a rejected reorder and keeps the acknowledged list instead of a false optimistic order', async () => {
  vi.mocked(topicsAPI.reorderTopics).mockRejectedValue({
    response: { status: 409 },
  });
  const client = await mount();
  act(() => dnd.onDragEnd(drop));
  await waitFor(() => expect(coursesAPI.getCourse).toHaveBeenCalledTimes(2));
  expect(topicsAPI.reorderTopics).toHaveBeenCalledTimes(1);
  expect(
    client
      .getQueryData<ReturnType<typeof response>>([
        'account',
        '1',
        'catalog',
        'course',
        '10',
        { includeTopics: true },
      ])
      ?.data.data?.course.topics?.map((topic: { id: number }) => topic.id),
  ).toEqual([1, 2, 3]);
});
it('shows server-stored topic states and saves a change through the API instead of component memory', async () => {
  vi.mocked(topicsAPI.setTopicProgress).mockResolvedValue({
    data: {
      success: true,
      data: { progress: { topicId: 1, courseId: 10, status: 'in_progress' } },
    },
  } as Awaited<ReturnType<typeof topicsAPI.setTopicProgress>>);
  await mount();
  await waitFor(() =>
    expect(
      screen.getByText('Tamamlandı', { selector: 'div' }).previousElementSibling
        ?.textContent,
    ).toBe('1'),
  );
  fireEvent.click(screen.getAllByTitle('Devam Ediyor')[0]);
  await waitFor(() =>
    expect(topicsAPI.setTopicProgress).toHaveBeenCalledWith(1, 'in_progress'),
  );
  await waitFor(() =>
    expect(topicsAPI.getTopicProgress).toHaveBeenCalledTimes(2),
  );
});

it('loads archived topics only on request, disables reordering and restores through the API', async () => {
  const archivedTopic = {
    ...topics[0],
    id: 7,
    name: 'Archived topic',
    isActive: false,
  };
  vi.mocked(coursesAPI.getCourseTopics).mockResolvedValue({
    data: { success: true, data: { topics: [archivedTopic] } },
  } as Awaited<ReturnType<typeof coursesAPI.getCourseTopics>>);
  vi.mocked(topicsAPI.updateTopic).mockResolvedValue({
    data: { success: true },
  } as Awaited<ReturnType<typeof topicsAPI.updateTopic>>);
  await mount();
  expect(coursesAPI.getCourseTopics).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Arşivdekiler' }));
  await screen.findByText('Archived topic');
  expect(coursesAPI.getCourseTopics).toHaveBeenCalledWith('10', {
    isActive: false,
  });
  expect(dnd.disabled).toBe(true);
  expect(screen.queryByTitle('Tamamlandı')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Geri al' }));
  await waitFor(() =>
    expect(topicsAPI.updateTopic).toHaveBeenCalledWith('7', { isActive: true }),
  );
  await waitFor(() =>
    expect(topicsAPI.getTopicProgress).toHaveBeenCalledTimes(2),
  );
  await waitFor(() =>
    expect(coursesAPI.getCourseTopics).toHaveBeenCalledTimes(2),
  );
});
