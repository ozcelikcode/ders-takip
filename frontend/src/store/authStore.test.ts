import { useUserPreferencesStore } from './userPreferencesStore';
import { defaultPreferences } from '@study-tracker/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../lib/queryClient';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { authAPI } from '../services/api';
import type { AuthResponse, User } from '../types/auth';
import { useAuthStore } from './authStore';

vi.mock('../services/api', () => ({ authAPI: { refreshToken: vi.fn(), logout: vi.fn(), login: vi.fn(), updateProfile: vi.fn() } }));

const user = (id: string): User => ({
  id, username: `user${id}`, email: `user${id}@example.test`, firstName: 'Test', lastName: 'User', fullName: 'Test User',
  role: 'student', isActive: true, preferences: { ...defaultPreferences }, createdAt: '2026-10-15T00:00:00Z',
});

afterEach(() => { useAuthStore.getState().clearAuth(); queryClient.clear(); localStorage.clear(); });

describe('account cache boundaries', () => {
  it('clears the previous account’s cached resources on identity changes', () => {
    useAuthStore.setState({ user: user('1') });
    queryClient.setQueryData(['courses'], [{ id: 'private-course' }]);
    useAuthStore.setState({ user: user('2') });
    expect(queryClient.getQueryData(['courses'])).toBeUndefined();
  });

  it('clears private resources on logout', () => {
    useAuthStore.setState({ user: user('1') });
    queryClient.setQueryData(['courses'], ['private']);
    useAuthStore.getState().clearAuth();
    expect(queryClient.getQueryData(['courses'])).toBeUndefined();
  });

  it('does not let a late query from the previous account replace the new account’s data', async () => {
    useAuthStore.setState({ user: user('1') });
    let complete: (value: string[]) => void = () => { throw new Error('Query did not start'); };
    const pending = queryClient.fetchQuery({
      queryKey: ['courses'], queryFn: () => new Promise<string[]>((resolve) => { complete = resolve; }),
    }).catch(() => undefined);
    useAuthStore.setState({ user: user('2') });
    queryClient.setQueryData(['courses'], ['second-account']);
    complete(['first-account']);
    await pending;
    expect(queryClient.getQueryData(['courses'])).toEqual(['second-account']);
  });
});

const sessionResponse = (id: string, token: string): AxiosResponse<AuthResponse> => ({
  data: { success: true, message: '', data: { user: user(id), tokens: { accessToken: token, expiresIn: '15m' } } },
  status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() },
});

describe('in-memory session lifecycle', () => {
  it('coalesces concurrent refresh requests and keeps both credentials out of storage', async () => {
    vi.mocked(authAPI.refreshToken).mockClear();
    vi.mocked(authAPI.refreshToken).mockResolvedValue(sessionResponse('1', 'new-access'));
    const tokens = await Promise.all([useAuthStore.getState().refreshSession(), useAuthStore.getState().refreshSession()]);
    expect(tokens).toEqual(['new-access', 'new-access']);
    expect(authAPI.refreshToken).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });
  it('does not restore an identity when a refresh response arrives after logout', async () => {
    let complete: (response: AxiosResponse<AuthResponse>) => void = () => { throw new Error('Refresh did not start'); };
    vi.mocked(authAPI.refreshToken).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    vi.mocked(authAPI.logout).mockClear();
    useAuthStore.setState({ user: user('1'), accessToken: 'old-access', isAuthenticated: true });
    const pending = useAuthStore.getState().refreshSession().catch(() => undefined);
    useAuthStore.getState().logout();
    complete(sessionResponse('1', 'late-access'));
    await pending;
    await vi.waitFor(() => expect(authAPI.logout).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
  it('clears the current identity if refresh fails', async () => {
    useAuthStore.setState({ user: user('1'), accessToken: 'old-access', isAuthenticated: true });
    vi.mocked(authAPI.refreshToken).mockRejectedValueOnce(new Error('Session revoked'));
    await expect(useAuthStore.getState().refreshSession()).rejects.toThrow('Session revoked');
    expect(useAuthStore.getState().user).toBeNull();
  });
  it('rejects an account change during refresh instead of replaying old requests as the new user', async () => {
    useAuthStore.setState({ user: user('1'), accessToken: 'old-access', isAuthenticated: true });
    vi.mocked(authAPI.refreshToken).mockResolvedValueOnce(sessionResponse('2', 'different-account'));
    await expect(useAuthStore.getState().refreshSession()).rejects.toThrow('Account changed');
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('offline logout intent', () => {
  it('keeps logout pending and refuses cookie refresh on reload until revocation succeeds', async () => {
    vi.mocked(authAPI.logout).mockRejectedValue(new Error('Offline'));
    vi.mocked(authAPI.refreshToken).mockClear();
    useAuthStore.setState({ user: user('1'), accessToken: 'old-access', isAuthenticated: true });
    useAuthStore.getState().logout();
    await vi.waitFor(() => expect(localStorage.getItem('auth-logout-pending')).toBe('1'));
    await useAuthStore.getState().initializeAuth();
    expect(authAPI.refreshToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('auth-logout-pending')).toBe('1');
  });
});

it('does not restore a profile response after the account changed', async () => {
  useAuthStore.setState({ user: user('A'), isAuthenticated: true });
  let resolve!: (value: unknown) => void;
  vi.mocked(authAPI.updateProfile).mockReturnValue(new Promise<unknown>(complete => { resolve = complete; }) as ReturnType<typeof authAPI.updateProfile>);
  const pending = useAuthStore.getState().updateProfile({ firstName: 'Updated' }).catch(() => undefined);
  useAuthStore.getState().clearAuth();
  useAuthStore.setState({ user: user('B'), isAuthenticated: true });
  resolve({ data: { data: { user: user('A') } } });
  await pending;
  expect(useAuthStore.getState().user?.id).toBe('B');
});

it('keeps a confirmed preference when an older refresh snapshot arrives later', async () => {
  useAuthStore.setState({ user: user('A'), isAuthenticated: true });
  let resolve!: (value: unknown) => void;
  vi.mocked(authAPI.refreshToken).mockReturnValue(new Promise<unknown>(complete => { resolve = complete; }) as ReturnType<typeof authAPI.refreshToken>);
  const pending = useAuthStore.getState().refreshSession();
  const updated = { ...user('A'), preferences: { ...defaultPreferences, theme: 'dark' as const } };
  vi.mocked(authAPI.updateProfile).mockResolvedValue({ data: { data: { user: updated } } } as Awaited<ReturnType<typeof authAPI.updateProfile>>);
  await useUserPreferencesStore.getState().updatePreferences({ theme: 'dark' });
  resolve({ data: { data: { user: user('A'), tokens: { accessToken: 'fresh-access', expiresIn: '15m' } } } });
  await pending;
  expect(useAuthStore.getState().accessToken).toBe('fresh-access');
  expect(useAuthStore.getState().user?.preferences.theme).toBe('dark');
  expect(useUserPreferencesStore.getState().preferences.theme).toBe('dark');
});

it('accepts an explicit profile preference acknowledgement after an earlier preference save', async () => {
  useAuthStore.setState({ user: user('A'), isAuthenticated: true });
  let resolve!: (value: unknown) => void;
  vi.mocked(authAPI.updateProfile).mockReturnValueOnce(new Promise<unknown>(complete => { resolve = complete; }) as ReturnType<typeof authAPI.updateProfile>);
  const pending = useAuthStore.getState().updateProfile({ preferences: { studyField: 'DIL' } });
  useUserPreferencesStore.getState().bindUser('A', { ...defaultPreferences, theme: 'dark' });
  resolve({ data: { data: { user: { ...user('A'), preferences: { ...defaultPreferences, theme: 'dark', studyField: 'DIL' } } } } });
  await pending;
  expect(useUserPreferencesStore.getState().preferences.studyField).toBe('DIL');
  expect(useUserPreferencesStore.getState().preferences.theme).toBe('dark');
});
