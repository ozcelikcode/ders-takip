import { useAccountQueryKeys } from '../hooks/useAccountQueryKeys';
import type {
  ReorderTopicsInput,
  TopicProgressStatus,
} from '@study-tracker/contracts';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  SortAsc,
  SortDesc,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopicEditorModal from '../components/modals/TopicEditorModal';
import CourseEditorModal from '../components/modals/CourseEditorModal';
import CatalogDeleteDialog, {
  type CatalogDeleteTarget,
} from '../components/catalog/CatalogDeleteDialog';
import { catalogIcon } from '../components/catalog/catalogIcons';
import { canManageCourse } from '../lib/catalogAccess';
import { useCatalogMutation } from '../hooks/useCatalogMutation';
import type { CatalogCourse, CatalogTopic as Topic } from '../types/catalog';
import { coursesAPI, topicsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

type TopicStatus = TopicProgressStatus;
type SortOption = 'order' | 'name' | 'difficulty' | 'time';
type FilterOption =
  | 'all'
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'Kolay'
  | 'Orta'
  | 'Zor';

const CourseDetailPage = () => {
  const accountKeys = useAccountQueryKeys();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [courseEditorOpen, setCourseEditorOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState<CatalogDeleteTarget | null>(null);
  const [archived, setArchived] = useState(false);
  const restore = useCatalogMutation();

  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [topicEditorOpen, setTopicEditorOpen] = useState(false);

  const queryClient = useQueryClient();

  // Reorder topics mutation
  const reorderMutation = useMutation({
    mutationFn: (input: ReorderTopicsInput) =>
      topicsAPI.reorderTopics(id!, input),
    onSuccess: () => {
      toast.success('Konu sıralaması güncellendi');
    },
    onError: () => {
      toast.error('Sıralama güncellenirken hata oluştu');
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.catalog() }),
  });

  const progressKey = accountKeys.resource('topic-progress');
  const { data: progressData } = useQuery({
    queryKey: progressKey,
    queryFn: async () =>
      (await topicsAPI.getTopicProgress()).data.data?.progress ?? [],
  });
  const topicStatuses: Record<number, TopicStatus> = Object.fromEntries(
    (progressData ?? []).map((entry) => [entry.topicId, entry.status]),
  );

  const statusLabels: Record<TopicStatus, string> = {
    not_started: 'Başlanmadı',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
  };
  const progressMutation = useMutation({
    mutationFn: ({
      topicId,
      status,
    }: {
      topicId: number;
      status: TopicStatus;
    }) => topicsAPI.setTopicProgress(topicId, status),
    onSuccess: (_response, { status }) =>
      toast.success(`Konu durumu: ${statusLabels[status]}`),
    onError: () => toast.error('Konu durumu kaydedilemedi'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: progressKey }),
  });

  const {
    data: courseData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: accountKeys.catalog('course', id, { includeTopics: true }),
    queryFn: () => coursesAPI.getCourse(id!, { includeTopics: true }),
    enabled: !!id,
  });

  const course: CatalogCourse | undefined = courseData?.data?.data?.course;

  const canEdit = !!course && canManageCourse(course, user);
  const archiveQuery = useQuery({
    queryKey: accountKeys.catalog('course-topics', id, { isActive: false }),
    queryFn: async () =>
      (await coursesAPI.getCourseTopics(id!, { isActive: false })).data.data
        ?.topics as Topic[] | undefined,
    enabled: !!id && archived && canEdit,
  });

  const updateTopicStatus = (topicId: number, status: TopicStatus) =>
    progressMutation.mutate({ topicId, status });

  const getTopicStatus = (topicId: number): TopicStatus =>
    topicStatuses[topicId] ?? 'not_started';

  const sortTopics = (topics: Topic[]) => {
    const sorted = [...topics].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'order':
          comparison = a.order - b.order;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'tr');
          break;
        case 'difficulty': {
          const difficultyOrder = { Kolay: 1, Orta: 2, Zor: 3 };
          comparison =
            difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        }
        case 'time':
          comparison = a.estimatedTime - b.estimatedTime;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const filterTopics = (topics: Topic[]) => {
    if (filterBy === 'all') return topics;

    if (['Kolay', 'Orta', 'Zor'].includes(filterBy)) {
      return topics.filter((topic) => topic.difficulty === filterBy);
    }

    return topics.filter((topic) => getTopicStatus(topic.id) === filterBy);
  };

  const getStats = () => {
    if (!course?.topics)
      return { total: 0, completed: 0, inProgress: 0, notStarted: 0 };

    const total = course.topics.length;
    const completed = course.topics.filter(
      (topic) => getTopicStatus(topic.id) === 'completed',
    ).length;
    const inProgress = course.topics.filter(
      (topic) => getTopicStatus(topic.id) === 'in_progress',
    ).length;
    const notStarted = total - completed - inProgress;

    return { total, completed, inProgress, notStarted };
  };

  const handleDragEnd = (result: DropResult) => {
    if (
      !result.destination ||
      !course?.topics ||
      !canReorder ||
      result.destination.index === result.source.index
    )
      return;

    const items = Array.from(filteredAndSortedTopics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers based on new positions
    const topicOrders = items.map((topic, index) => ({
      id: topic.id,
      order: index + 1,
    }));

    reorderMutation.mutate({
      topicOrders,
      expectedTopics: course.topics.map((topic) => ({
        id: topic.id,
        updatedAt: topic.updatedAt,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Ders yüklenirken bir hata oluştu.</p>
        <Link
          to="/courses"
          className="text-primary-600 hover:text-primary-500 mt-2 inline-block"
        >
          Derslere geri dön
        </Link>
      </div>
    );
  }

  const stats = getStats();
  const progressPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const visibleTopics = archived
    ? (archiveQuery.data ?? [])
    : (course.topics ?? []);
  const filteredAndSortedTopics = sortTopics(filterTopics(visibleTopics));
  const Icon = catalogIcon(course.icon);

  const canReorder =
    canEdit &&
    !archived &&
    sortBy === 'order' &&
    sortOrder === 'asc' &&
    filterBy === 'all' &&
    !reorderMutation.isPending &&
    !isFetching &&
    !restore.isPending;

  return (
    <div className="space-y-6">
      <Link
        to="/courses"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Derslere geri dön
      </Link>
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
              style={{ color: course.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">
                {course.category?.name}
                {course.isGlobal ? ' · Ortak ders' : ''}
              </p>
              <h1 className="mt-1 break-words text-2xl font-medium tracking-tight">
                {course.name}
              </h1>
              {course.description && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {course.description}
                </p>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => setCourseEditorOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Dersi düzenle
              </button>
              <button
                className="btn btn-secondary text-red-600"
                onClick={() =>
                  setDeleting({
                    kind: 'course',
                    id: course.id,
                    name: course.name,
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                Dersi sil
              </button>
            </div>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          {[
            [stats.total, 'Toplam Konu'],
            [stats.completed, 'Tamamlandı'],
            [stats.inProgress, 'Devam Ediyor'],
            [stats.notStarted, 'Başlanmadı'],
          ].map(([count, label]) => (
            <div key={label}>
              <div className="text-2xl font-medium tabular-nums">{count}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-[var(--muted)]">
            <span>Aktif konularda ilerleme</span>
            <span>{progressPercentage}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Konu ilerlemesi"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded bg-[var(--subtle)]"
          >
            <div
              className="h-full bg-[var(--solid)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => {
                  setEditingTopic(null);
                  setTopicEditorOpen(true);
                }}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4" />
                Konu ekle
              </button>
              <button
                className="btn btn-secondary"
                aria-pressed={archived}
                onClick={() => {
                  setArchived(!archived);
                  setFilterBy('all');
                }}
              >
                <Archive className="h-4 w-4" />
                {archived ? 'Aktif konular' : 'Arşivdekiler'}
              </button>
            </>
          )}
          <select
            aria-label="Konuları filtrele"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="input w-auto text-sm"
          >
            <option value="all">Tüm Konular</option>
            {!archived && (
              <>
                <option value="not_started">Başlanmadı</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
              </>
            )}
            <option value="Kolay">Kolay</option>
            <option value="Orta">Orta</option>
            <option value="Zor">Zor</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label="Sıralama yönünü değiştir"
            className="icon-button"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
          <select
            aria-label="Konuları sırala"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input w-auto text-sm"
          >
            <option value="order">Sıra</option>
            <option value="name">İsim</option>
            <option value="difficulty">Zorluk</option>
            <option value="time">Süre</option>
          </select>
        </div>
      </div>
      {canEdit && (
        <p className="text-sm text-[var(--muted)]" role="status">
          {archived
            ? 'Arşivdeki konuların çalışma geçmişi ve ilerlemesi korunur. Geri alınan konular aktif listede görünür.'
            : reorderMutation.isPending
              ? 'Sıralama kaydediliyor…'
              : 'Sıralamak için tüm konuları artan sıra görünümünde açın.'}
        </p>
      )}
      {restore.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {restore.errorMessage}
        </p>
      )}
      {archived && archiveQuery.isPending && (
        <p role="status" className="text-sm text-[var(--muted)]">
          Arşiv yükleniyor…
        </p>
      )}
      {archived && archiveQuery.isError && (
        <div role="alert" className="panel p-4">
          Arşiv yüklenemedi.{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void archiveQuery.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="topics" isDropDisabled={!canReorder}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {filteredAndSortedTopics.map((topic, index) => (
                <Draggable
                  key={topic.id}
                  draggableId={String(topic.id)}
                  index={index}
                  isDragDisabled={!canReorder}
                >
                  {(provided, snapshot) => (
                    <article
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`panel flex flex-wrap items-center gap-3 p-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    >
                      {canReorder && (
                        <div
                          {...provided.dragHandleProps}
                          aria-label={`${topic.name} konusunu sırala`}
                          className="cursor-grab text-[var(--muted)]"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1 basis-40">
                        <h2 className="break-words text-sm font-medium">
                          {topic.name}
                        </h2>
                        {topic.description && (
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {topic.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted)]">
                          <span>{topic.difficulty}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {topic.estimatedTime} dk
                          </span>
                          {archived && <span>Arşivde</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!archived && (
                          <div
                            className="flex rounded-md border p-0.5"
                            role="group"
                            aria-label={`${topic.name} ilerleme durumu`}
                          >
                            {(
                              [
                                'not_started',
                                'in_progress',
                                'completed',
                              ] as const
                            ).map((status) => {
                              const StatusIcon =
                                status === 'completed'
                                  ? CheckCircle2
                                  : status === 'in_progress'
                                    ? RotateCcw
                                    : Circle;
                              return (
                                <button
                                  key={status}
                                  onClick={() =>
                                    updateTopicStatus(topic.id, status)
                                  }
                                  className={`icon-button ${getTopicStatus(topic.id) === status ? 'bg-[var(--subtle)] text-[var(--text)]' : ''}`}
                                  title={statusLabels[status]}
                                  aria-pressed={
                                    getTopicStatus(topic.id) === status
                                  }
                                  disabled={progressMutation.isPending}
                                >
                                  <StatusIcon className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {canEdit && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`${topic.name} konusunu düzenle`}
                              onClick={() => {
                                setEditingTopic(topic);
                                setTopicEditorOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {archived ? (
                              <button
                                className="btn btn-secondary"
                                disabled={restore.isPending}
                                onClick={() =>
                                  void restore.save(
                                    () =>
                                      topicsAPI.updateTopic(String(topic.id), {
                                        isActive: true,
                                      }),
                                    'Konu aktif listeye alındı.',
                                  )
                                }
                              >
                                <RotateCcw className="h-4 w-4" />
                                Geri al
                              </button>
                            ) : (
                              <button
                                className="icon-button"
                                aria-label={`${topic.name} konusunu arşivle`}
                                onClick={() =>
                                  setDeleting({
                                    kind: 'topic',
                                    id: topic.id,
                                    name: topic.name,
                                  })
                                }
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {filteredAndSortedTopics.length === 0 &&
        (!archived || archiveQuery.isSuccess) && (
          <div className="panel p-10 text-center">
            <h2 className="text-sm font-medium">
              {archived ? 'Arşivde konu bulunamadı' : 'Konu bulunamadı'}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {filterBy !== 'all'
                ? 'Seçilen filtreye uygun konu bulunmuyor.'
                : archived
                  ? 'Arşivlediğiniz konular burada görünür.'
                  : 'Bu derse henüz konu eklenmedi.'}
            </p>
          </div>
        )}
      <TopicEditorModal
        isOpen={topicEditorOpen}
        onClose={() => setTopicEditorOpen(false)}
        course={course}
        topic={editingTopic}
      />
      <CourseEditorModal
        isOpen={courseEditorOpen}
        onClose={() => setCourseEditorOpen(false)}
        course={course}
      />
      <CatalogDeleteDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          if (deleting?.kind === 'course') navigate('/courses');
        }}
      />
    </div>
  );
};

export default CourseDetailPage;
