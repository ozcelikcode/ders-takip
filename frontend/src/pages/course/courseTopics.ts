import { appLocale } from '../../lib/locale';
import type { TopicProgressStatus } from '@study-tracker/contracts';
import type { CatalogTopic as Topic } from '../../types/catalog';

export type TopicStatus = TopicProgressStatus;
export type SortOption = 'order' | 'name' | 'difficulty' | 'time';
export type SortOrder = 'asc' | 'desc';
export type FilterOption =
  | 'all'
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'Kolay'
  | 'Orta'
  | 'Zor';

export const statusLabels: Record<TopicStatus, string> = {
  not_started: 'Başlanmadı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
};

const difficultyOrder = { Kolay: 1, Orta: 2, Zor: 3 };

export const sortTopics = (
  topics: readonly Topic[],
  sortBy: SortOption,
  sortOrder: SortOrder,
) =>
  [...topics].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'order':
        comparison = a.order - b.order;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name, appLocale);
        break;
      case 'difficulty':
        comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        break;
      case 'time':
        comparison = a.estimatedTime - b.estimatedTime;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

export const filterTopics = (
  topics: readonly Topic[],
  filterBy: FilterOption,
  statusOf: (topicId: number) => TopicStatus,
) => {
  if (filterBy === 'all') return [...topics];
  if (filterBy === 'Kolay' || filterBy === 'Orta' || filterBy === 'Zor')
    return topics.filter((topic) => topic.difficulty === filterBy);
  return topics.filter((topic) => statusOf(topic.id) === filterBy);
};

export const topicStats = (
  topics: readonly Topic[] | undefined,
  statusOf: (topicId: number) => TopicStatus,
) => {
  if (!topics) return { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
  const total = topics.length;
  const completed = topics.filter((topic) => statusOf(topic.id) === 'completed').length;
  const inProgress = topics.filter((topic) => statusOf(topic.id) === 'in_progress').length;
  return { total, completed, inProgress, notStarted: total - completed - inProgress };
};
