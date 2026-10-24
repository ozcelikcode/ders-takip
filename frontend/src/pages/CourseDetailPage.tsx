import { useTerms } from '../hooks/useTerms';
import { useAccountQueryKeys } from '../hooks/useAccountQueryKeys';
import type { ReorderTopicsInput } from '@study-tracker/contracts';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Archive, Plus, SortAsc, SortDesc } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopicEditorModal from '../components/modals/TopicEditorModal';
import CourseEditorModal from '../components/modals/CourseEditorModal';
import CatalogDeleteDialog, {
  type CatalogDeleteTarget,
} from '../components/catalog/CatalogDeleteDialog';
import { canManageCourse } from '../lib/catalogAccess';
import { useCatalogMutation } from '../hooks/useCatalogMutation';
import type { CatalogCourse, CatalogTopic as Topic } from '../types/catalog';
import { coursesAPI, topicsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import CourseHeader from './course/CourseHeader';
import CourseGoalPanel from '../components/goals/CourseGoalPanel';
import CourseTagsPanel from '../components/tags/CourseTagsPanel';
import TopicCard from './course/TopicCard';
import {
  filterTopics,
  sortTopics,
  topicStats,
  type FilterOption,
  type SortOption,
  type SortOrder,
  type TopicStatus,
} from './course/courseTopics';
import { useText } from '../store/languageStore';


const CourseDetailPage = () => {
  const accountKeys = useAccountQueryKeys();
  const t = useTerms();
  const text = useText().course;
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [courseEditorOpen, setCourseEditorOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState<CatalogDeleteTarget | null>(null);
  const [archived, setArchived] = useState(false);
  const restore = useCatalogMutation();

  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [topicEditorOpen, setTopicEditorOpen] = useState(false);

  const queryClient = useQueryClient();

  // Reorder topics mutation
  const reorderMutation = useMutation({
    mutationFn: (input: ReorderTopicsInput) =>
      topicsAPI.reorderTopics(id!, input),
    onSuccess: () => {
      toast.success(text.reordered(t));
    },
    onError: () => {
      toast.error(text.reorderFailed);
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

  const progressMutation = useMutation({
    mutationFn: ({
      topicId,
      status,
    }: {
      topicId: number;
      status: TopicStatus;
    }) => topicsAPI.setTopicProgress(topicId, status),
    onSuccess: (_response, { status }) =>
      toast.success(text.statusSaved(t, text.topicStatuses[status])),
    onError: () => toast.error(text.statusFailed(t)),
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
        ?.topics,
    enabled: !!id && archived && canEdit,
  });

  const updateTopicStatus = (topicId: number, status: TopicStatus) =>
    progressMutation.mutate({ topicId, status });

  const getTopicStatus = (topicId: number): TopicStatus =>
    topicStatuses[topicId] ?? 'not_started';

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
        <p className="text-red-600">{text.loadFailed(t)}</p>
        <Link
          to="/courses"
          className="text-primary-600 hover:text-primary-500 mt-2 inline-block"
        >
          {text.back(t)}
        </Link>
      </div>
    );
  }

  const stats = topicStats(course.topics, getTopicStatus);
  const progressPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const visibleTopics = archived
    ? (archiveQuery.data ?? [])
    : (course.topics ?? []);
  const filteredAndSortedTopics = sortTopics(filterTopics(visibleTopics, filterBy, getTopicStatus), sortBy, sortOrder);

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
        className="inline-flex items-center gap-2 text-sm text-(--muted)"
      >
        <ArrowLeft className="h-4 w-4" />
        {text.back(t)}
      </Link>
      <CourseHeader
        course={course}
        stats={stats}
        progressPercentage={progressPercentage}
        canEdit={canEdit}
        onEdit={() => setCourseEditorOpen(true)}
        onDelete={() =>
          setDeleting({ kind: 'course', id: course.id, name: course.name })
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <CourseGoalPanel courseId={course.id} />
        <CourseTagsPanel courseId={course.id} />
      </div>
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
                {text.addTopic(t)}
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
                {archived ? text.activeTopics(t) : text.archivedTopics}
              </button>
            </>
          )}
          <select
            aria-label={text.filter(t)}
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="input w-auto text-sm"
          >
            <option value="all">{text.allTopics(t)}</option>
            {!archived && (
              <>
                <option value="not_started">{text.topicStatuses.not_started}</option>
                <option value="in_progress">{text.topicStatuses.in_progress}</option>
                <option value="completed">{text.topicStatuses.completed}</option>
              </>
            )}
            <option value="Kolay">{text.difficulties.Kolay}</option>
            <option value="Orta">{text.difficulties.Orta}</option>
            <option value="Zor">{text.difficulties.Zor}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label={text.sortDirection}
            className="icon-button"
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </button>
          <select
            aria-label={text.sort(t)}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input w-auto text-sm"
          >
            <option value="order">{text.sortOptions.order}</option>
            <option value="name">{text.sortOptions.name}</option>
            <option value="difficulty">{text.sortOptions.difficulty}</option>
            <option value="time">{text.sortOptions.time}</option>
          </select>
        </div>
      </div>
      {canEdit && (
        <p className="text-sm text-(--muted)" role="status">
          {archived
            ? text.archiveNote(t)
            : reorderMutation.isPending
              ? text.savingOrder
              : text.reorderHint(t)}
        </p>
      )}
      {restore.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {restore.errorMessage}
        </p>
      )}
      {archived && archiveQuery.isPending && (
        <p role="status" className="text-sm text-(--muted)">
          {text.archiveLoading}
        </p>
      )}
      {archived && archiveQuery.isError && (
        <div role="alert" className="panel p-4">
          {text.archiveFailed}{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void archiveQuery.refetch()}
          >
            {text.retry}
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
                    <TopicCard
                      topic={topic}
                      provided={provided}
                      snapshot={snapshot}
                      canReorder={canReorder}
                      canEdit={canEdit}
                      archived={archived}
                      status={getTopicStatus(topic.id)}
                      progressPending={progressMutation.isPending}
                      restorePending={restore.isPending}
                      onStatusChange={(status) => updateTopicStatus(topic.id, status)}
                      onEdit={() => {
                        setEditingTopic(topic);
                        setTopicEditorOpen(true);
                      }}
                      onArchive={() =>
                        setDeleting({ kind: 'topic', id: topic.id, name: topic.name })
                      }
                      onRestore={() =>
                        void restore.save(
                          () => topicsAPI.updateTopic(String(topic.id), { isActive: true }),
                          text.restored(t),
                        )
                      }
                    />
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
              {archived ? text.noArchived(t) : text.noTopics(t)}
            </h2>
            <p className="mt-2 text-sm text-(--muted)">
              {filterBy !== 'all'
                ? text.noFilterMatch(t)
                : archived
                  ? text.archivedAppear(t)
                  : text.noTopicsYet(t)}
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
