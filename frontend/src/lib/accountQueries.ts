import { queryOptions } from '@tanstack/react-query';
import { coursesAPI, studySessionsAPI } from '../services/api';
import type { accountQueryKeys } from './queryKeys';

/** Account queries read by more than one screen; each screen adds its own observer options (select, refetch). */
type AccountKeys = ReturnType<typeof accountQueryKeys>;

export const coursesWithTopicsQuery = (keys: AccountKeys) => queryOptions({
  queryKey: keys.catalog('courses', { includeTopics: true }),
  queryFn: () => coursesAPI.getCourses({ includeTopics: true }),
});

export const todaySessionsQuery = (keys: AccountKeys, today: string, timezone: string) => queryOptions({
  queryKey: keys.sessions('todays-sessions', today),
  queryFn: async () => {
    const response = await studySessionsAPI.getSessions({ startDate: today, endDate: today, timezone });
    if (!response.data.data?.sessions) throw new Error('Today sessions response is missing');
    return response.data.data.sessions;
  },
});
