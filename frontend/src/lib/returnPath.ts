/**
 * The in-app address a signed-out visitor was sent away from (ProtectedRoute keeps it in the router state), so
 * signing in can return there. Only same-site paths are accepted: never another origin or a protocol-relative `//`.
 */
export function returnPath(state: unknown, fallback = '/dashboard'): string {
  const from = (state as { from?: { pathname?: unknown; search?: unknown; hash?: unknown } } | null)?.from;
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.startsWith('/\\') || pathname === '/login') return fallback;
  const search = typeof from?.search === 'string' && from.search.startsWith('?') ? from.search : '';
  const hash = typeof from?.hash === 'string' && from.hash.startsWith('#') ? from.hash : '';
  return pathname + search + hash;
}
