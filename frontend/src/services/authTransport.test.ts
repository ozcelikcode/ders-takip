/// <reference types="node" />
// @vitest-environment node
import { defaultPreferences } from '@study-tracker/contracts';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createServer, type ServerResponse } from 'node:http';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  removeItem: (key: string) => storage.delete(key),
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
  clear: () => storage.clear(),
});
vi.stubGlobal('window', {});
vi.stubGlobal('navigator', {});
const user = {
  id: '1',
  username: 'fixture',
  email: 'fixture@example.com',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  role: 'student' as const,
  isActive: true,
  preferences: { ...defaultPreferences },
  createdAt: '2026-10-15T00:00:00Z',
};
let refreshCount = 0;
let resourceCount = 0;
let profileActive = 0;
let profilePeak = 0;
let lateResponse: ServerResponse | undefined;
const json = (response: ServerResponse, status: number, data: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
};
const server = createServer((request, response) => {
  if (request.url === '/api/auth/profile') {
    profileActive++;
    profilePeak = Math.max(profilePeak, profileActive);
    setTimeout(() => {
      profileActive--;
      json(response, 200, {
        success: true,
        data: { user: { ...user, id: 1 } },
      });
    }, 30);
  } else if (request.url === '/api/auth/refresh-token') {
    refreshCount++;
    json(response, 200, {
      success: true,
      message: 'Oturum yenilendi',
      data: {
        user: { ...user, id: 1 },
        tokens: { accessToken: 'replacement-access', expiresIn: '15m' },
      },
    });
  } else if (request.headers.authorization === 'Bearer replacement-access') {
    if (lateResponse) {
      json(lateResponse, 401, { error: { message: 'Expired' } });
      lateResponse = undefined;
    }
    json(response, 200, { success: true });
  } else {
    resourceCount++;
    if (resourceCount === 3) lateResponse = response;
    else json(response, 401, { error: { message: 'Expired' } });
  }
});
let api: typeof import('./api').default;
let authAPI: typeof import('./api').authAPI;
let authStore: typeof import('../store/authStore').useAuthStore;
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Test server did not start');
  vi.stubEnv('VITE_API_BASE_URL', `http://127.0.0.1:${address.port}/api`);
  const transport = await import('./api');
  api = transport.default;
  authAPI = transport.authAPI;
  authStore = (await import('../store/authStore')).useAuthStore;
});
afterEach(() => authStore.getState().clearAuth());
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('401 refresh transport', () => {
  it('refreshes once for concurrent and late 401 responses and retries with the current in-memory token', async () => {
    authStore.setState({
      user,
      accessToken: 'expired-access',
      isAuthenticated: true,
      isLoading: false,
    });
    const results = await Promise.all([
      api.get('/first'),
      api.get('/second'),
      api.get('/late'),
    ]);
    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect(refreshCount).toBe(1);
    expect(authStore.getState().accessToken).toBe('replacement-access');
    expect(storage.size).toBe(0);
  });
});

it('serializes profile writes from separate callers over the real transport', async () => {
  authStore.setState({
    user,
    accessToken: 'replacement-access',
    isAuthenticated: true,
    isLoading: false,
  });
  const results = await Promise.all([
    authAPI.updateProfile({ firstName: 'Updated' }),
    authAPI.updateProfile({ preferences: { theme: 'dark' } }),
  ]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(profilePeak).toBe(1);
});
