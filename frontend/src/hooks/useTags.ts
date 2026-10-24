import { useQuery } from '@tanstack/react-query';
import { tagsAPI } from '../services/api';
import { useAccountQueryKeys } from './useAccountQueryKeys';

/** The person's tags and attachments. Kept under the catalog key, so record changes refresh them too. */
export const useTags = () => {
  const keys = useAccountQueryKeys();
  return useQuery({ queryKey: keys.catalog('tags'), queryFn: tagsAPI.list });
};
