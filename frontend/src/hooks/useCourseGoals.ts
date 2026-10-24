import { useQuery } from '@tanstack/react-query';
import { courseGoalsAPI } from '../services/api';
import { useAccountQueryKeys } from './useAccountQueryKeys';

/** The person's weekly targets per record. Kept under the catalog key, so record changes refresh them too. */
export const useCourseGoals = () => {
  const keys = useAccountQueryKeys();
  return useQuery({ queryKey: keys.catalog('course-goals'), queryFn: courseGoalsAPI.list });
};
