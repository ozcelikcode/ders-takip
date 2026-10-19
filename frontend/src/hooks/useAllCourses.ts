import { useQuery } from '@tanstack/react-query';
import { coursesAPI } from '../services/api';
import { useAccountQueryKeys } from './useAccountQueryKeys';

/** Every visible course including archived ones; editors and statistics share this cache. */
export const useAllCourses = () => {
  const accountKeys = useAccountQueryKeys();
  return useQuery({
    queryKey: accountKeys.catalog('courses', { isActive: 'all' }),
    queryFn: async () => {
      const response = await coursesAPI.getCourses({ isActive: 'all' });
      if (!response.data.data?.courses) throw new Error('Course list response is missing');
      return response.data.data.courses;
    },
  });
};
