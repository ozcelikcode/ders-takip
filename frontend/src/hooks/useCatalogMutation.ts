import { useAccountQueryKeys } from './useAccountQueryKeys';
import { useAccountMutation } from './useAccountMutation';

export function useCatalogMutation() {
  const keys = useAccountQueryKeys();
  return useAccountMutation([
    keys.catalog(),
    keys.sessions(),
    keys.resource('topic-progress'),
  ]);
}
