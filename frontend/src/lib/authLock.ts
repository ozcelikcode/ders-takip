export const withAuthLock = async <T>(operation: () => Promise<T>): Promise<T> => (
  navigator.locks ? await navigator.locks.request('study-tracker-auth', operation) : operation()
);
