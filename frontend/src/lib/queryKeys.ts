export const accountQueryKeys = (userId: string | null | undefined, timezone: string) => {
  const root = ['account', userId ?? 'anonymous'] as const;
  return {
    catalog: (...filters: unknown[]) => [...root, 'catalog', ...filters] as const,
    sessions: (...filters: unknown[]) => filters.length === 0
      ? [...root, 'sessions'] as const
      : [...root, 'sessions', timezone, ...filters] as const,
    resource: (...filters: unknown[]) => [...root, ...filters] as const,
  };
};
