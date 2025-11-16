import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Clock,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  RotateCcw,
  BookOpen,
  Filter,
  SortAsc,
  SortDesc,
  Calculator,
  Microscope,
  Globe,
  Triangle,
  Atom,
  FlaskConical,
  Dna,
  Landmark,
  Map,
  Brain,
  Heart,
  BookText
} from 'lucide-react';
import { coursesAPI, topicsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import CreateTopicModal from '../components/modals/CreateTopicModal';

interface Topic {
  id: number;
  name: string;
  description: string;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
}

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Course {
  id: number;
  name: string;
  category?: Category;
  description: string;
  color: string;
  icon: string;
  topics?: Topic[];
}

type TopicStatus = 'not_started' | 'in_progress' | 'completed';
type SortOption = 'order' | 'name' | 'difficulty' | 'time';
type FilterOption = 'all' | 'not_started' | 'in_progress' | 'completed' | 'Kolay' | 'Orta' | 'Zor';

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [topicStatuses, setTopicStatuses] = useState<Record<number, TopicStatus>>({});
  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Reorder topics mutation
  const reorderMutation = useMutation({
    mutationFn: (topicOrders: { id: number; order: number }[]) =>
      topicsAPI.reorderTopics(id!, topicOrders),
    onSuccess: () => {
      toast.success('Konu sıralaması güncellendi');
      queryClient.invalidateQueries({ queryKey: ['course', id, { includeTopics: true }] });
    },
    onError: () => {
      toast.error('Sıralama güncellenirken hata oluştu');
    },
  });

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      BookOpen,
      Calculator,
      Microscope,
      Globe,
      Triangle,
      Atom,
      FlaskConical,
      Dna,
      Landmark,
      Map,
      Brain,
      Heart,
      BookText,
    };
    return icons[iconName] || BookOpen;
  };

  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course', id, { includeTopics: true }],
    queryFn: () => coursesAPI.getCourse(id!, { includeTopics: true }),
    enabled: !!id,
  });

  const course: Course | undefined = courseData?.data?.data?.course;

  const updateTopicStatus = (topicId: number, status: TopicStatus) => {
    setTopicStatuses(prev => ({
      ...prev,
      [topicId]: status
    }));

    const statusLabels = {
      not_started: 'Başlanmadı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı'
    };

    toast.success(`Konu durumu: ${statusLabels[status]}`);
  };

  const getTopicStatus = (topicId: number): TopicStatus => {
    return topicStatuses[topicId] || 'not_started';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Kolay': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'Orta': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Zor': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <RotateCcw className="h-5 w-5 text-yellow-600" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/10';
      case 'in_progress': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/10';
      default: return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
    }
  };

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
        case 'difficulty':
          const difficultyOrder = { 'Kolay': 1, 'Orta': 2, 'Zor': 3 };
          comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
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
      return topics.filter(topic => topic.difficulty === filterBy);
    }

    return topics.filter(topic => getTopicStatus(topic.id) === filterBy);
  };

  const getStats = () => {
    if (!course?.topics) return { total: 0, completed: 0, inProgress: 0, notStarted: 0 };

    const total = course.topics.length;
    const completed = course.topics.filter(topic => getTopicStatus(topic.id) === 'completed').length;
    const inProgress = course.topics.filter(topic => getTopicStatus(topic.id) === 'in_progress').length;
    const notStarted = total - completed - inProgress;

    return { total, completed, inProgress, notStarted };
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !course?.topics) return;

    const items = Array.from(filteredAndSortedTopics);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order numbers based on new positions
    const topicOrders = items.map((topic, index) => ({
      id: topic.id,
      order: index + 1,
    }));

    // Optimistically update UI
    queryClient.setQueryData(['course', id], (old: any) => {
      if (!old?.data?.data?.course) return old;
      return {
        ...old,
        data: {
          ...old.data,
          data: {
            ...old.data.data,
            course: {
              ...old.data.data.course,
              topics: items.map((topic, index) => ({
                ...topic,
                order: index + 1,
              })),
            },
          },
        },
      };
    });

    // Send to backend
    reorderMutation.mutate(topicOrders);
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
        <Link to="/courses" className="text-primary-600 hover:text-primary-500 mt-2 inline-block">
          Derslere geri dön
        </Link>
      </div>
    );
  }

  const stats = getStats();
  const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const filteredAndSortedTopics = sortTopics(filterTopics(course.topics || []));

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        to="/courses"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Derslere geri dön
      </Link>

      {/* Course Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: course.color }}
            >
              {(() => {
                const IconComponent = getIconComponent(course.icon);
                return <IconComponent className="w-8 h-8" />;
              })()}
            </div>
            <div className="ml-4">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {course.name}
                </h1>
                {course.category && (
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: course.category.color }}
                  >
                    {course.category.name}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {course.description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Konu</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tamamlandı</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Devam Ediyor</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.notStarted}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Başlanmadı</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">İlerleme</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Add Topic Button */}
          <button
            onClick={() => setIsCreateTopicModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Konu Ekle
          </button>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="input text-sm"
            >
              <option value="all">Tüm Konular</option>
              <option value="not_started">Başlanmadı</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
              <option value="Kolay">Kolay</option>
              <option value="Orta">Orta</option>
              <option value="Zor">Zor</option>
            </select>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input text-sm"
          >
            <option value="order">Sıra</option>
            <option value="name">İsim</option>
            <option value="difficulty">Zorluk</option>
            <option value="time">Süre</option>
          </select>
        </div>
      </div>

      {/* Topics List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="topics" isDropDisabled={!isAdmin || sortBy !== 'order'}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {filteredAndSortedTopics.map((topic, index) => (
                <Draggable
                  key={topic.id}
                  draggableId={topic.id.toString()}
                  index={index}
                  isDragDisabled={!isAdmin || sortBy !== 'order'}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`border rounded-lg p-4 transition-all duration-200 ${getStatusColor(getTopicStatus(topic.id))} ${
                        snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Drag Handle */}
                        {isAdmin && sortBy === 'order' && (
                          <div
                            {...provided.dragHandleProps}
                            className="mr-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        )}

                        <div className="flex items-center space-x-4 flex-1">
                          {/* Status Button */}
                          <div className="flex space-x-1">
                            <button
                              onClick={() => updateTopicStatus(topic.id, 'not_started')}
                              className={`p-1 rounded transition-colors ${
                                getTopicStatus(topic.id) === 'not_started'
                                  ? 'bg-gray-100 dark:bg-gray-700'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title="Başlanmadı"
                            >
                              <Circle className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => updateTopicStatus(topic.id, 'in_progress')}
                              className={`p-1 rounded transition-colors ${
                                getTopicStatus(topic.id) === 'in_progress'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20'
                                  : 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                              }`}
                              title="Devam Ediyor"
                            >
                              <RotateCcw className="h-4 w-4 text-yellow-600" />
                            </button>
                            <button
                              onClick={() => updateTopicStatus(topic.id, 'completed')}
                              className={`p-1 rounded transition-colors ${
                                getTopicStatus(topic.id) === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/20'
                                  : 'hover:bg-green-100 dark:hover:bg-green-900/20'
                              }`}
                              title="Tamamlandı"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </button>
                          </div>

                          {/* Topic Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {topic.name}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(topic.difficulty)}`}>
                                {topic.difficulty}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {topic.description}
                            </p>
                          </div>

                          {/* Time */}
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4 mr-1" />
                            {topic.estimatedTime}dk
                          </div>

                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {filteredAndSortedTopics.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Konu bulunamadı
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Seçilen filtreye uygun konu bulunmuyor.
          </p>
        </div>
      )}

      {/* Create Topic Modal */}
      {id && (
        <CreateTopicModal
          isOpen={isCreateTopicModalOpen}
          onClose={() => setIsCreateTopicModalOpen(false)}
          courseId={parseInt(id)}
        />
      )}
    </div>
  );
};

export default CourseDetailPage;