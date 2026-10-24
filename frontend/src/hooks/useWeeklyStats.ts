import { useQuery } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { studySessionsAPI } from '../services/api';
import { useAccountQueryKeys } from './useAccountQueryKeys';
import { useCurrentDateKey } from './useCurrentDateKey';
import { useWeekStart } from './useWeekStart';

/** Measured stats for the current week; the chart and the goal panel share one request. */
export const useWeeklyStats = () => {
  const accountKeys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const weekStartsOn = useWeekStart();
  const weekStart = useMemo(
    () => startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn }),
    [today, weekStartsOn],
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), 'yyyy-MM-dd')),
    [weekStart],
  );
  const query = useQuery({
    queryKey: accountKeys.sessions('weekly-progress', weekDates[0]),
    queryFn: async () =>
      (
        await studySessionsAPI.getStats({ startDate: weekDates[0], endDate: weekDates[6] })
      ).data.data?.stats,
    refetchInterval: 30000,
  });
  return { today, weekStart, weekDates, query };
};
