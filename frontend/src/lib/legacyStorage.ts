// Keys earlier versions kept in browser storage: persisted access tokens and settings, preferences and read notices
// stored without an account, and the archive later versions made of those. None of them is read any more.
const legacyKeys = ['auth-storage', 'settings-storage', 'user-preferences-storage', 'readNotifications', 'unassigned-account-state'];

/** Removes what older versions left in this browser, so a shared computer keeps no earlier account's values. */
export const clearLegacyStorage = () => {
  try {
    legacyKeys.forEach(key => localStorage.removeItem(key));
  } catch { /* Storage may be unavailable; nothing to clear then. */ }
};
