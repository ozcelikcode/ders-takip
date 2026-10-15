import { describe, expect, it } from 'vitest';
import { getRecentSessions } from './sessionHelpers';

describe('recent session ordering', () => {
  it('orders by completion time instead of the planned start or API order', () => {
    const sessions = [
      { id: 1, endTime: '2026-10-15T12:00:00Z', completedAt: '2026-10-15T10:00:00Z' },
      { id: 2, endTime: '2026-10-14T12:00:00Z', completedAt: '2026-10-15T11:00:00Z' },
    ];
    expect(getRecentSessions(sessions).map(session => session.id)).toEqual([2, 1]);
  });

  it('uses the end time for historical sessions without a completion timestamp', () => {
    const sessions = [
      { id: 1, endTime: '2026-10-15T12:00:00Z' },
      { id: 2, endTime: '2026-10-14T12:00:00Z', completedAt: '2026-10-15T13:00:00Z' },
    ];
    expect(getRecentSessions(sessions).map(session => session.id)).toEqual([2, 1]);
  });

  it('returns the five newest sessions without modifying the shared query data', () => {
    const sessions = Array.from({ length: 7 }, (_, index) => ({ id: index, endTime: `2026-10-${10 + index}T12:00:00Z` }));
    const originalIds = sessions.map(session => session.id);
    expect(getRecentSessions(sessions).map(session => session.id)).toEqual([6, 5, 4, 3, 2]);
    expect(sessions.map(session => session.id)).toEqual(originalIds);
  });
});
