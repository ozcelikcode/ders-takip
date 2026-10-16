/// <reference types="node" />
// @vitest-environment node
import { defaultPreferences } from '@study-tracker/contracts';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { queryClient } from '../lib/queryClient';
import { accountQueryKeys } from '../lib/queryKeys';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.stubGlobal('localStorage', { removeItem: vi.fn(), getItem: () => null, setItem: vi.fn() });
vi.stubGlobal('window', {});
vi.stubGlobal('navigator', {});
const user = { id: '1', username: 'fixture', email: 'fixture@example.com', firstName: 'Test', lastName: 'User', fullName: 'Test User', role: 'student' as const, isActive: true, preferences: { ...defaultPreferences }, createdAt: '2026-10-15T00:00:00Z' };
const session = { id: 10, updatedAt: '2026-10-16T09:00:00.001Z' };
const requests: { method: string | undefined; url: string | undefined; body: Record<string, unknown> }[] = [];
let conflict = false;
const server = createServer((request, response) => {
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    requests.push({ method: request.method, url: request.url, body: JSON.parse(body || '{}') });
    response.writeHead(conflict ? 409 : 200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(conflict ? { error: { message: 'Refresh the stale session' } } : { success: true, data: { session } }));
  });
});
let transport: typeof import('./api').studySessionsAPI;
let catalog: Pick<typeof import('./api'), 'coursesAPI' | 'categoriesAPI' | 'topicsAPI'>;
let authStore: typeof import('../store/authStore').useAuthStore;
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');
  vi.stubEnv('VITE_API_BASE_URL', `http://127.0.0.1:${address.port}/api`);
  catalog = await import('./api');
  transport = (await import('./api')).studySessionsAPI;
  authStore = (await import('../store/authStore')).useAuthStore;
});
afterEach(() => { conflict = false; requests.length = 0; authStore.getState().clearAuth(); });
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('sends the snapshot version on updates, actions and deletes over real HTTP', async () => {
  authStore.setState({ user, accessToken: 'fixture', isAuthenticated: true, isLoading: false });
  await transport.updateSession(session, { title: 'Changed' });
  await transport.startSession(session); await transport.pauseSession(session);
  await transport.controlPomodoro(session, { command: 'pause' });
  await transport.completeSession(session, { notes: 'Saved' }); await transport.deleteSession(session);
  expect(requests.map(request => [request.method, request.url])).toEqual([
    ['PUT', '/api/study-sessions/10'], ['PATCH', '/api/study-sessions/10/start'], ['PATCH', '/api/study-sessions/10/pause'], ['POST', '/api/study-sessions/10/pomodoro'], ['PATCH', '/api/study-sessions/10/complete'], ['DELETE', '/api/study-sessions/10'],
  ]);
  for (const request of requests) expect(request.body.expectedUpdatedAt).toBe(session.updatedAt);
  expect(requests[0]?.body.title).toBe('Changed'); expect(requests[3]?.body.command).toBe('pause'); expect(requests[4]?.body.notes).toBe('Saved');
});
it('invalidates every affected session view on conflict without retrying a stale mutation', async () => {
  authStore.setState({ user, accessToken: 'fixture', isAuthenticated: true, isLoading: false });
  const keys = accountQueryKeys(user.id, 'Europe/Istanbul');
  const views = [keys.sessions('daily', '2026-10-16'), keys.sessions('dashboard'), keys.sessions('pomodoro')];
  for (const key of views) queryClient.setQueryData(key, ['snapshot']);
  conflict = true;
  await expect(transport.startSession(session)).rejects.toMatchObject({ response: { status: 409 } });
  expect(requests).toHaveLength(1);
  for (const key of views) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
});

it('refreshes catalog and session association views after catalog writes without touching other accounts', async () => {
  authStore.setState({ user, accessToken: 'fixture', isAuthenticated: true, isLoading: false });
  const keys = accountQueryKeys(user.id, 'Europe/Istanbul');
  const views = [keys.catalog('course', '10'), keys.catalog('categories'), keys.sessions('planner'), keys.sessions('activities')];
  const foreign = accountQueryKeys('2', 'Europe/Istanbul').sessions('planner');
  queryClient.setQueryData(foreign, ['foreign']);
  for (const operation of [() => catalog.coursesAPI.deleteCourse('10'), () => catalog.categoriesAPI.deleteCategory('2', 3), () => catalog.topicsAPI.updateTopic('10', { name: 'Updated' })]) {
    for (const key of views) queryClient.setQueryData(key, ['snapshot']);
    await operation();
    for (const key of views) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(foreign)?.isInvalidated).toBe(false);
  }
  expect(requests[1]?.body).toEqual({ migrateToCategoryId: 3 });
});
it('sends the complete reorder snapshot and refreshes stale lists on 409 without retry', async () => {
  authStore.setState({ user, accessToken: 'fixture', isAuthenticated: true, isLoading: false });
  const key = accountQueryKeys(user.id, '').catalog('course', '10');
  queryClient.setQueryData(key, ['snapshot']);
  const input = { topicOrders: [{ id: 3, order: 1 }, { id: 2, order: 2 }], expectedTopics: [{ id: 2, updatedAt: session.updatedAt }, { id: 3, updatedAt: session.updatedAt }] };
  conflict = true;
  await expect(catalog.topicsAPI.reorderTopics('10', input)).rejects.toMatchObject({ response: { status: 409 } });
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({ method: 'PUT', url: '/api/topics/course/10/reorder', body: input });
  expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
});
