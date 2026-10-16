export const accountQueryKeys = (userId: string | number | null | undefined, timezone: string) => {
  const root = ['account', userId == null ? 'anonymous' : String(userId)] as const;
  return {
    catalog: (...filters: unknown[]) => [...root, 'catalog', ...filters] as const,
    sessions: (...filters: unknown[]) => filters.length === 0
      ? [...root, 'sessions'] as const
      : [...root, 'sessions', timezone, ...filters] as const,
    resource: (...filters: unknown[]) => [...root, ...filters] as const,
  };
};
