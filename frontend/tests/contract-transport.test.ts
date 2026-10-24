/// <reference types="node" />
// @vitest-environment node
import { defaultPreferences } from '@study-tracker/contracts';
import { createServer, type ServerResponse } from 'node:http';
import { beforeAll, afterAll, afterEach, expect, it, vi } from 'vitest';
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});
vi.stubGlobal('window', {});
vi.stubGlobal('navigator', {});
const wireUser = {
  id: 1,
  username: 'fixture',
  email: 'fixture@example.com',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  role: 'student' as const,
  isActive: true,
  preferences: { ...defaultPreferences },
  createdAt: '2026-10-17T00:00:00Z',
};
const localUser = { ...wireUser, id: '1' };
let payload: unknown;
let delayedPassword: ServerResponse | undefined;
const json = (response: ServerResponse, data: unknown) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
};
const server = createServer((request, response) => {
  if (request.url === '/api/auth/change-password') delayedPassword = response;
  else json(response, payload);
});
let api: typeof import('../src/services/api');
let auth: typeof import('../src/store/authStore').useAuthStore;
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Fixture server unavailable');
  vi.stubEnv('VITE_API_BASE_URL', `http://127.0.0.1:${address.port}/api`);
  api = await import('../src/services/api');
  auth = (await import('../src/store/authStore')).useAuthStore;
});
afterEach(() => {
  auth.getState().clearAuth();
  delayedPassword = undefined;
  storage.clear();
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('validates auth wire responses, normalizes numeric IDs and strips unexpected secrets', async () => {
  payload = {
    success: true,
    message: 'Giriş başarılı',
    data: {
      user: { ...wireUser, password: 'must-not-reach-state' },
      tokens: {
        accessToken: 'fixture-access',
        expiresIn: '15m',
        refreshToken: 'must-not-reach-state',
      },
    },
  };
  const response = await api.authAPI.login({
    email: wireUser.email,
    password: 'fixture-password',
  });
  expect(response.data.data.user.id).toBe('1');
  expect(response.data.data.user).not.toHaveProperty('password');
  expect(response.data.data.tokens).not.toHaveProperty('refreshToken');
  payload = {
    success: true,
    message: 'Bad response',
    data: {
      user: { ...wireUser, preferences: {} },
      tokens: { accessToken: 'fixture-access', expiresIn: '15m' },
    },
  };
  await expect(
    auth
      .getState()
      .login({ email: wireUser.email, password: 'fixture-password' }),
  ).rejects.toThrow();
  expect(auth.getState().isAuthenticated).toBe(false);
  expect(auth.getState().accessToken).toBeNull();
});
it('rejects missing profile data without replacing the acknowledged account snapshot', async () => {
  auth.setState({
    user: localUser,
    isAuthenticated: true,
    accessToken: 'fixture-access',
    isLoading: false,
  });
  payload = { success: true, data: {} };
  await expect(
    auth.getState().updateProfile({ firstName: 'Changed' }),
  ).rejects.toThrow();
  expect(auth.getState().user?.firstName).toBe('Test');
});
it('does not turn malformed lists or overview status into successful empty data', async () => {
  for (const data of [
    undefined,
    {},
    { users: [], pagination: { total: '0' } },
  ]) {
    payload = { success: true, data };
    await expect(api.usersAPI.getUsers()).rejects.toThrow();
  }
  payload = {
    success: true,
    data: {
      overview: {
        users: { total: 1, active: 1 },
        courses: { total: 0, active: 0 },
        sessions: {
          totalSessions: 1,
          completedSessions: 0,
          studySeconds: 0,
          lastActivity: null,
        },
        recentSessions: [
          {
            id: 1,
            title: 'Bad status',
            status: 'unknown',
            sessionType: 'study',
            duration: 60,
            userName: 'Test',
          },
        ],
      },
    },
  };
  await expect(api.usersAPI.getAdminOverview()).rejects.toThrow();
});
it('validates backup verification flags and reset acknowledgements, stripping host paths', async () => {
  const backup = {
    id: 1,
    filename: 'fixture.sqlite',
    size: 100,
    type: 'manual',
    createdAt: '2026-10-17T00:00:00Z',
    path: '/private/fixture.sqlite',
  };
  payload = { success: true, data: [{ ...backup, verified: 'true' }] };
  await expect(api.backupAPI.getBackups()).rejects.toThrow();
  payload = { success: true, data: [backup] };
  const response = await api.backupAPI.getBackups();
  expect(response.data.data?.[0]?.verified).toBeUndefined();
  expect(response.data.data?.[0]).not.toHaveProperty('path');
  payload = { success: false, message: 'Failed restore' };
  await expect(api.backupAPI.restoreBackup(1, 'fixture-password')).rejects.toThrow();
  payload = { success: true, message: 'Missing safety ID', data: {} };
  await expect(api.backupAPI.resetData('settings_only', 'fixture-password')).rejects.toThrow();
});
it('does not log a different account out when an earlier password change finishes late', async () => {
  auth.setState({
    user: localUser,
    isAuthenticated: true,
    accessToken: 'fixture-access',
    isLoading: false,
  });
  const pending = api.authAPI.changePassword({
    currentPassword: 'fixture-password',
    newPassword: 'replacement-password',
  });
  await vi.waitFor(() => expect(delayedPassword).toBeDefined());
  auth.getState().clearAuth();
  auth.setState({
    user: { ...localUser, id: '2' },
    isAuthenticated: true,
    accessToken: 'second-access',
  });
  json(delayedPassword!, { success: true, message: 'Changed' });
  await pending;
  expect(auth.getState().user?.id).toBe('2');
  expect(auth.getState().isAuthenticated).toBe(true);
  expect(storage.has('auth-logout-pending')).toBe(false);
});
