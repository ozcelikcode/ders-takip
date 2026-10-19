import { useUserPreferencesStore } from './userPreferencesStore';
import { useSettingsStore } from './settingsStore';
import type { ProfileUpdate } from '../types/auth';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { create } from 'zustand';
import { queryClient } from '../lib/queryClient';
import { authAPI, onboardingAPI } from '../services/api';
import type { CompleteOnboardingInput } from '@study-tracker/contracts';
import type { LoginCredentials, RegisterData, User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  epoch: number;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  completeOnboarding: (input: CompleteOnboardingInput) => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<string>;
  clearAuth: () => void;
  isAdmin: () => boolean;
}
let refreshPromise: Promise<string> | null = null;
let logoutPromise: Promise<unknown> | null = null;
let initialized = false;
const channel = typeof window.BroadcastChannel === 'function' ? new window.BroadcastChannel('study-tracker-auth') : null;
const notifyPeers = () => channel?.postMessage('session-changed');
const finishLogout = async () => { await authAPI.logout(); localStorage.removeItem('auth-logout-pending'); };

const acceptUserSnapshot = (user: User, preferenceRevision: number): User => {
  const preferences = useUserPreferencesStore.getState();
  const current = useAuthStore.getState().user;
  return current && String(current.id) === String(user.id) && preferences.revision !== preferenceRevision
    ? { ...user, preferences: preferences.preferences }
    : user;
};

// Access credentials live only in memory. The refresh cookie is HttpOnly.
localStorage.removeItem('auth-storage');
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null, accessToken: null, isAuthenticated: false, isLoading: true, epoch: 0,
  login: async credentials => {
    if (logoutPromise) await logoutPromise;
    if (refreshPromise) await refreshPromise.catch(() => undefined);
    if (localStorage.getItem('auth-logout-pending')) await finishLogout();
    const epoch = get().epoch + 1;
    set({ epoch });
    const response = await authAPI.login(credentials).catch(error => { toast.error(isAxiosError(error) ? error.response?.data?.error?.message || 'Giriş yapılamadı' : 'Giriş yapılamadı'); throw error; });
    if (get().epoch !== epoch) throw new Error('Authentication attempt superseded');
    set({ user: response.data.data.user, accessToken: response.data.data.tokens.accessToken, isAuthenticated: true, isLoading: false });
    notifyPeers();
  },
  register: async data => {
    if (logoutPromise) await logoutPromise;
    if (refreshPromise) await refreshPromise.catch(() => undefined);
    if (localStorage.getItem('auth-logout-pending')) await finishLogout();
    const epoch = get().epoch + 1;
    set({ epoch });
    const response = await authAPI.register(data).catch(error => { toast.error(isAxiosError(error) ? error.response?.data?.error?.message || 'Kayıt oluşturulamadı' : 'Kayıt oluşturulamadı'); throw error; });
    if (get().epoch !== epoch) throw new Error('Authentication attempt superseded');
    set({ user: response.data.data.user, accessToken: response.data.data.tokens.accessToken, isAuthenticated: true, isLoading: false });
    notifyPeers();
  },
  logout: () => {
    const pending = refreshPromise;
    localStorage.setItem('auth-logout-pending', '1');
    get().clearAuth();
    notifyPeers();
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

if (channel) channel.onmessage = () => useAuthStore.getState().clearAuth();
