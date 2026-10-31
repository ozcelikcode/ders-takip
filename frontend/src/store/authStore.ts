import { useUserPreferencesStore } from './userPreferencesStore';
import { useSettingsStore } from './settingsStore';
import type { ProfileUpdate } from '../types/auth';
import toast from 'react-hot-toast';
import { serverMessage } from '../lib/messages';
import { create } from 'zustand';
import { queryClient } from '../lib/queryClient';
import { authAPI, onboardingAPI } from '../services/api';
import { unsubscribeBrowser } from '../lib/push';
import type { AccountImportResult, CompleteOnboardingInput } from '@study-tracker/contracts';
import type { LoginCredentials, RegisterData, User } from '../types/auth';
import { useLanguageStore } from './languageStore';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  epoch: number;
  /** True after someone signed out on purpose (here or in another tab); sign-in then starts fresh on the dashboard. */
  signedOut: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  importAccount: (file: unknown) => Promise<AccountImportResult>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<string>;
  clearAuth: () => void;
  isAdmin: () => boolean;
}
let refreshPromise: Promise<string> | null = null;
let logoutPromise: Promise<unknown> | null = null;
let initialized = false;
const channel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('study-tracker-auth') : null;
type PeerMessage = 'signed-in' | 'signed-out';
const notifyPeers = (message: PeerMessage) => channel?.postMessage(message);
const finishLogout = async () => { await authAPI.logout(); localStorage.removeItem('auth-logout-pending'); };

const acceptUserSnapshot = (user: User, preferenceRevision: number): User => {
  const preferences = useUserPreferencesStore.getState();
  const current = useAuthStore.getState().user;
  return current && String(current.id) === String(user.id) && preferences.revision !== preferenceRevision
    ? { ...user, preferences: preferences.preferences }
    : user;
};

// Access credentials live only in memory. The refresh cookie is HttpOnly.
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null, accessToken: null, isAuthenticated: false, isLoading: true, epoch: 0, signedOut: false,
  login: async credentials => {
    if (logoutPromise) await logoutPromise;
    if (refreshPromise) await refreshPromise.catch(() => undefined);
    if (localStorage.getItem('auth-logout-pending')) await finishLogout();
    const epoch = get().epoch + 1;
    set({ epoch });
    const response = await authAPI.login(credentials).catch(error => { toast.error(serverMessage(error) || useLanguageStore.getState().text.errors.signInFailed); throw error; });
    if (get().epoch !== epoch) throw new Error('Authentication attempt superseded');
    set({ user: response.data.data.user, accessToken: response.data.data.tokens.accessToken, isAuthenticated: true, isLoading: false, signedOut: false });
    notifyPeers('signed-in');
  },
  register: async data => {
    if (logoutPromise) await logoutPromise;
    if (refreshPromise) await refreshPromise.catch(() => undefined);
    if (localStorage.getItem('auth-logout-pending')) await finishLogout();
    const epoch = get().epoch + 1;
    set({ epoch });
    const response = await authAPI.register(data).catch(error => { toast.error(serverMessage(error) || useLanguageStore.getState().text.errors.signUpFailed); throw error; });
    if (get().epoch !== epoch) throw new Error('Authentication attempt superseded');
    set({ user: response.data.data.user, accessToken: response.data.data.tokens.accessToken, isAuthenticated: true, isLoading: false, signedOut: false });
    notifyPeers('signed-in');
  },
  logout: () => {
    // This browser must not keep showing the account's reminders once it is signed out.
    void unsubscribeBrowser().catch(() => undefined);
    const pending = refreshPromise;
    localStorage.setItem('auth-logout-pending', '1');
    get().clearAuth();
    set({ signedOut: true });
    notifyPeers('signed-out');
    // Let any rotation finish before clearing its cookie, then revoke the resulting session.
    logoutPromise = (async () => { await pending?.catch(() => undefined); await finishLogout(); })().catch(() => undefined).finally(() => { logoutPromise = null; });
  },
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false, epoch: get().epoch + 1 }),
  refreshSession: () => {
    if (refreshPromise) return refreshPromise;
    const epoch = get().epoch;
    const preferenceRevision = useUserPreferencesStore.getState().revision;
    refreshPromise = (async () => {
      try {
        const response = await authAPI.refreshToken();
        if (get().epoch !== epoch) throw new Error('Session changed while refreshing');
        const { user, tokens } = response.data.data;
        if (get().user && String(get().user?.id) !== String(user.id)) { get().clearAuth(); throw new Error('Account changed during refresh'); }
        set({ user: acceptUserSnapshot(user, preferenceRevision), accessToken: tokens.accessToken, isAuthenticated: true, isLoading: false });
        return tokens.accessToken;
      } catch (error) {
        if (get().epoch === epoch) get().clearAuth();
        throw error;
      } finally { refreshPromise = null; }
    })();
    return refreshPromise;
  },
  initializeAuth: async () => {
    if (initialized) return;
    initialized = true;
    try {
      if (localStorage.getItem('auth-logout-pending')) await finishLogout();
      else await get().refreshSession();
    } catch { /* Anonymous startup is expected. */ }
    finally { set({ isLoading: false }); }
  },
  updateProfile: async data => {
    const epoch = get().epoch;
    const preferenceRevision = useUserPreferencesStore.getState().revision;
    const response = await authAPI.updateProfile(data);
    if (get().epoch !== epoch) throw new Error('Account changed while updating profile');
    const user = response.data.data?.user;
    // Profile writes are serialized; an acknowledged explicit preference patch is authoritative.
    const hasPreferencePatch = Object.keys(data.preferences ?? {}).length > 0;
    set({ user: user ? (hasPreferencePatch ? user : acceptUserSnapshot(user, preferenceRevision)) : null });
  },
  completeOnboarding: async input => {
    const epoch = get().epoch;
    const response = await onboardingAPI.complete(input);
    if (get().epoch !== epoch) throw new Error('Account changed while finishing onboarding');
    const user = response.data.data?.user;
    if (user) set({ user });
  },
  importAccount: async file => {
    const epoch = get().epoch;
    const { result, user } = await authAPI.importAccount(file);
    if (get().epoch !== epoch) throw new Error('Account changed while importing');
    set({ user });
    return result;
  },
  isAdmin: () => get().user?.role === 'admin',
}));
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) {
    queryClient.clear();
    useSettingsStore.getState().clearAdminSettings();
    useUserPreferencesStore.getState().bindUser(state.user ? String(state.user.id) : null, state.user?.preferences);
  } else if (state.user?.preferences !== previous.user?.preferences && useUserPreferencesStore.getState().pending === 0) {
    useUserPreferencesStore.getState().bindUser(state.user ? String(state.user.id) : null, state.user?.preferences);
  }
});

// Another tab signed in or out. A sign-in elsewhere replaced the shared cookie, so this tab drops its old
// account and picks up the new session instead of staying signed out (and signing in a second time).
if (channel) channel.onmessage = (event: MessageEvent<unknown>) => {
  const store = useAuthStore.getState();
  store.clearAuth();
  if (event.data === 'signed-out') useAuthStore.setState({ signedOut: true });
  if (event.data === 'signed-in') void store.refreshSession().catch(() => undefined);
};
