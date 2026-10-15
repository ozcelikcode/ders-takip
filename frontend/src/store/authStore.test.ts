import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../lib/queryClient';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { authAPI } from '../services/api';
import type { AuthResponse, User } from '../types/auth';
import { useAuthStore } from './authStore';

vi.mock('../services/api', () => ({ authAPI: { refreshToken: vi.fn(), logout: vi.fn(), login: vi.fn() } }));

const user = (id: string): User => ({
  id, username: `user${id}`, email: `user${id}@example.test`, firstName: 'Test', lastName: 'User', fullName: 'Test User',
  role: 'student', isActive: true, preferences: {}, createdAt: '2026-10-15T00:00:00Z',
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
