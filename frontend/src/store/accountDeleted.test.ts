import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it('signs every tab of this browser out when the account is deleted', async () => {
  const posted: unknown[] = [];
  vi.stubGlobal('BroadcastChannel', class {
    onmessage: unknown = null;
    postMessage(message: unknown) { posted.push(message); }
    addEventListener() {}
  });
  // The channel is opened when the store module loads, so it is loaded after the stub.
  const { useAuthStore } = await import('./authStore');
  useAuthStore.setState({ user: { id: '1' } as never, accessToken: 'token', isAuthenticated: true });
  useAuthStore.getState().accountDeleted();
  expect(posted).toEqual(['signed-out']);
  expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null, isAuthenticated: false, signedOut: true });
});
