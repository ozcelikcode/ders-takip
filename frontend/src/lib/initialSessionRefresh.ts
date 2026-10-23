declare global {
  interface Window {
    /** The session refresh index.html sends while the scripts download, under the same cross-tab auth lock. */
    initialSessionRefresh?: Promise<Response>;
  }
}

/** Hands the page's early session refresh to the first refresh that asks for it; later refreshes send their own. */
export const takeInitialSessionRefresh = (): Promise<Response> | undefined => {
  const pending = window.initialSessionRefresh;
  delete window.initialSessionRefresh;
  return pending;
};
