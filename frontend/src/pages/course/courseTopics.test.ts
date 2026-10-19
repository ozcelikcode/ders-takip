import { describe, expect, it } from 'vitest';
import type { CatalogTopic } from '../../types/catalog';
import { filterTopics, sortTopics, topicStats, type TopicStatus } from './courseTopics';

const topic = (id: number, overrides: Partial<CatalogTopic> = {}): CatalogTopic => ({
  id,
  name: `Konu ${id}`,
  estimatedTime: 30,
  difficulty: 'Orta',
  order: id,
  updatedAt: '2026-10-19T00:00:00Z',
  ...overrides,
});
const topics = [
  topic(1, { name: 'Çarpanlar', difficulty: 'Zor', estimatedTime: 90 }),
  topic(2, { name: 'Asal sayılar', difficulty: 'Kolay', estimatedTime: 20 }),
  topic(3, { name: 'Bölünebilme', difficulty: 'Orta', estimatedTime: 45 }),
];
const statuses: Record<number, TopicStatus> = { 1: 'completed', 2: 'in_progress' };
const statusOf = (id: number): TopicStatus => statuses[id] ?? 'not_started';

describe('course topic list helpers', () => {
  it('sorts by each key in both directions without mutating the input', () => {
    const ids = (list: CatalogTopic[]) => list.map((entry) => entry.id);
    expect(ids(sortTopics(topics, 'order', 'asc'))).toEqual([1, 2, 3]);
    expect(ids(sortTopics(topics, 'order', 'desc'))).toEqual([3, 2, 1]);
    expect(ids(sortTopics(topics, 'name', 'asc'))).toEqual([2, 3, 1]);
    expect(ids(sortTopics(topics, 'difficulty', 'asc'))).toEqual([2, 3, 1]);
    expect(ids(sortTopics(topics, 'time', 'desc'))).toEqual([1, 3, 2]);
    expect(topics.map((entry) => entry.id)).toEqual([1, 2, 3]);
  });

  it('filters by difficulty or progress status', () => {
    expect(filterTopics(topics, 'all', statusOf)).toHaveLength(3);
    expect(filterTopics(topics, 'Zor', statusOf).map((entry) => entry.id)).toEqual([1]);
    expect(filterTopics(topics, 'completed', statusOf).map((entry) => entry.id)).toEqual([1]);
    expect(filterTopics(topics, 'not_started', statusOf).map((entry) => entry.id)).toEqual([3]);
  });

  it('counts progress and tolerates a missing topic list', () => {
    expect(topicStats(topics, statusOf)).toEqual({ total: 3, completed: 1, inProgress: 1, notStarted: 1 });
    expect(topicStats(undefined, statusOf)).toEqual({ total: 0, completed: 0, inProgress: 0, notStarted: 0 });
  });
});
