import { currentLocaleTag } from '../../lib/locale';
import { topicDifficulties, type TopicDifficulty, type TopicProgressStatus } from '@study-tracker/contracts';
import type { CatalogTopic as Topic } from '../../types/catalog';

export type TopicStatus = TopicProgressStatus;
export type SortOption = 'order' | 'name' | 'difficulty' | 'time';
export type SortOrder = 'asc' | 'desc';
export type FilterOption =
  | 'all'
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | TopicDifficulty;


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
        comparison = a.name.localeCompare(b.name, currentLocaleTag());
        break;
      case 'difficulty':
        comparison = topicDifficulties.indexOf(a.difficulty) - topicDifficulties.indexOf(b.difficulty);
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
  if ((topicDifficulties as readonly string[]).includes(filterBy))
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
