// Unowned local values are preserved for manual recovery, never applied to an account.
export const archiveUnscopedState = () => {
  try {
    const keys = ['user-preferences-storage', 'readNotifications'];
    const values = Object.fromEntries(keys.flatMap(key => {
      const value = localStorage.getItem(key);
      return value === null ? [] : [[key, value]];
    }));
    if (Object.keys(values).length === 0) return;
    const archiveKey = 'unassigned-account-state';
    if (localStorage.getItem(archiveKey) !== null) return;
    localStorage.setItem(archiveKey, JSON.stringify({ capturedAt: new Date().toISOString(), values }));
    keys.forEach(key => localStorage.removeItem(key));
  } catch { /* Preserve the source when an archive cannot be written. */ }
};
