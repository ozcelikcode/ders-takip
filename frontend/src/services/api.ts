import type { SiteSettings, PublicSettings, SettingsPatch } from '@study-tracker/contracts';
import type { ProfileUpdate } from '../types/auth';
import { withAuthLock } from '../lib/authLock';
import axios, { AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../types/api';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';
import type { CreatePlanRequest, CreateStudySessionRequest, CreateTopicRequest, Plan, StudySession, Topic, UpdateStudySessionRequest, UpdateTopicRequest } from '../types/planner';
import { queryClient } from '../lib/queryClient';
import { accountQueryKeys } from '../lib/queryKeys';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthRequest extends InternalAxiosRequestConfig { _retry?: boolean; authEpoch?: number; }
const configuration = { baseURL: API_BASE_URL, timeout: 30000, withCredentials: true, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'StudyTracker' } };
const api = axios.create(configuration);
const authTransport = axios.create(configuration);
api.interceptors.request.use(config => {
  const state = useAuthStore.getState();
  const request = config as AuthRequest;
  if (request.authEpoch !== undefined && request.authEpoch !== state.epoch) throw new axios.CanceledError('Session changed');
  request.authEpoch = state.epoch;
  if (state.accessToken) config.headers.Authorization = `Bearer ${state.accessToken}`;
  return request;
});

// Toast debounce to prevent spam
const toastShown = new Set<string>();

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AuthRequest | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const state = useAuthStore.getState();
      if (!state.isAuthenticated || state.epoch !== originalRequest.authEpoch) return Promise.reject(error);
      try {
        const token = state.accessToken && originalRequest.headers.Authorization !== `Bearer ${state.accessToken}` ? state.accessToken : await state.refreshSession();
        if (useAuthStore.getState().epoch !== originalRequest.authEpoch) return Promise.reject(new axios.CanceledError('Session changed'));
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) { return Promise.reject(refreshError); }
    }

    if (error.response?.status === 401 && originalRequest?.authEpoch === useAuthStore.getState().epoch) useAuthStore.getState().clearAuth();

    const current = useAuthStore.getState();
    if (error.response?.status === 409 && originalRequest?.url?.startsWith('/study-sessions') && originalRequest.authEpoch === current.epoch) {
      void queryClient.invalidateQueries({ queryKey: accountQueryKeys(current.user?.id, '').sessions() });
    }

    // Handle common errors with debouncing
    let errorMessage: string;
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message === 'Network Error') {
      errorMessage = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
    } else {
      errorMessage = 'Beklenmeyen bir hata oluştu';
    }

    // Prevent duplicate toast messages
    const errorKey = `${error.config?.url || 'unknown'}-${errorMessage}`;
    if (!toastShown.has(errorKey)) {
      toastShown.add(errorKey);
      toast.error(errorMessage);

      // Clear the error after 10 seconds to allow showing it again
      setTimeout(() => {
        toastShown.delete(errorKey);
      }, 10000);
    }

    return Promise.reject(error);
  }
);

let profileQueue: Promise<unknown> = Promise.resolve();
const updateProfile = (data: ProfileUpdate): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
  const epoch = useAuthStore.getState().epoch;
  const operation = profileQueue.catch(() => undefined).then(() => {
    if (useAuthStore.getState().epoch !== epoch) throw new axios.CanceledError('Account changed before profile update');
    return api.put<ApiResponse<{ user: User }>>('/auth/profile', data);
  });
  profileQueue = operation;
  return operation;
};

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> =>
    withAuthLock(() => authTransport.post('/auth/login', credentials)),

  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    withAuthLock(() => authTransport.post('/auth/register', data)),

  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    withAuthLock(() => authTransport.post('/auth/logout')),

  getMe: (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.get('/auth/me'),

  updateProfile,

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/change-password', data).then(response => { useAuthStore.getState().logout(); return response; }),

  refreshToken: (): Promise<AxiosResponse<AuthResponse>> => withAuthLock(() => authTransport.post('/auth/refresh-token')),
};

// Courses API
export const coursesAPI = {
  getCourses: (params?: any): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/courses', { params }),

  getCourse: (id: string, params?: any): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/courses/${id}`, { params }),

  createCourse: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/courses', data),

  updateCourse: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/courses/${id}`, data),

  deleteCourse: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/courses/${id}`),

  getCourseTopics: (id: string, params?: any): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/courses/${id}/topics`, { params }),
};

// Categories API
export const categoriesAPI = {
  getCategories: (params?: any): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/categories', { params }),

  getCategory: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/categories/${id}`),

  createCategory: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/categories', data),

  updateCategory: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/categories/${id}`, data),

  deleteCategory: (id: string, migrateToCategoryId?: number): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/categories/${id}`, { data: { migrateToCategoryId } }),
};

// Users API (Admin)
export const usersAPI = {
  getUsers: (params?: any): Promise<AxiosResponse<ApiResponse>> =>
    api.get('/users', { params }),

  getUser: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/users/${id}`),

  createUser: (data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/users', data),

  updateUser: (id: string, data: any): Promise<AxiosResponse<ApiResponse>> =>
    api.put(`/users/${id}`, data),

  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/users/${id}`),

  getUserStats: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/users/${id}/stats`),
};

// Plans API
export const plansAPI = {
  getPlans: (params?: any): Promise<AxiosResponse<ApiResponse<{ plans: Plan[] }>>> =>
    api.get('/plans', { params }),

  getPlan: (id: string): Promise<AxiosResponse<ApiResponse<{ plan: Plan }>>> =>
    api.get(`/plans/${id}`),

  createPlan: (data: CreatePlanRequest): Promise<AxiosResponse<ApiResponse<{ plan: Plan }>>> =>
    api.post('/plans', data),

  updatePlan: (id: string, data: Partial<CreatePlanRequest>): Promise<AxiosResponse<ApiResponse<{ plan: Plan }>>> =>
    api.put(`/plans/${id}`, data),

  deletePlan: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/plans/${id}`),

  getPlanStats: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.get(`/plans/${id}/stats`),
};

// Study Sessions API
export const studySessionsAPI = {
  getSessions: (params?: any): Promise<AxiosResponse<ApiResponse<{ sessions: StudySession[] }>>> =>
    api.get('/study-sessions', { params }),

  getSession: (id: string): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.get(`/study-sessions/${id}`),

  createSession: (data: CreateStudySessionRequest): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post('/study-sessions', data),

  updateSession: (session: Pick<StudySession, 'id' | 'updatedAt'>, data: UpdateStudySessionRequest): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.put(`/study-sessions/${session.id}`, { ...data, expectedUpdatedAt: session.updatedAt }),

  deleteSession: (session: Pick<StudySession, 'id' | 'updatedAt'>): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/study-sessions/${session.id}`, { data: { expectedUpdatedAt: session.updatedAt } }),

  startSession: (session: Pick<StudySession, 'id' | 'updatedAt'>): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/start`, { expectedUpdatedAt: session.updatedAt }),

  pauseSession: (session: Pick<StudySession, 'id' | 'updatedAt'>): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/pause`, { expectedUpdatedAt: session.updatedAt }),

  completeSession: (session: Pick<StudySession, 'id' | 'updatedAt'>, data?: { notes?: string; productivity?: number }): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/complete`, { ...data, expectedUpdatedAt: session.updatedAt }),
};

// Topics API
export const topicsAPI = {
  getTopics: (params?: any): Promise<AxiosResponse<ApiResponse<{ topics: Topic[] }>>> =>
    api.get('/topics', { params }),

  getTopic: (id: string): Promise<AxiosResponse<ApiResponse<{ topic: Topic }>>> =>
    api.get(`/topics/${id}`),

  createTopic: (data: CreateTopicRequest): Promise<AxiosResponse<ApiResponse<{ topic: Topic }>>> =>
    api.post('/topics', data),

  updateTopic: (id: string, data: UpdateTopicRequest): Promise<AxiosResponse<ApiResponse<{ topic: Topic }>>> =>
    api.put(`/topics/${id}`, data),

  deleteTopic: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/topics/${id}`),

  reorderTopics: (courseId: string, topicOrders: { id: number; order: number }[]): Promise<AxiosResponse<ApiResponse<{ topics: Topic[] }>>> =>
    api.put(`/topics/course/${courseId}/reorder`, { topicOrders }),
};

// Settings API
export const settingsAPI = {
  getSettings: (): Promise<AxiosResponse<ApiResponse<PublicSettings>>> =>
    api.get('/settings'),

  updateSettings: (data: SettingsPatch): Promise<AxiosResponse<ApiResponse<SiteSettings>>> =>
    api.put('/settings', data),

  getAdminSettings: (): Promise<AxiosResponse<ApiResponse<SiteSettings>>> => api.get('/settings/admin'),
};

// Backup API
export const backupAPI = {
  getBackups: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.get('/backup'),

  createBackup: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.post('/backup/create'),

  restoreBackup: (id: number): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.post(`/backup/restore/${id}`),

  resetData: (mode: 'settings_only' | 'all'): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.post('/backup/reset', { mode }),
};

export default api;
