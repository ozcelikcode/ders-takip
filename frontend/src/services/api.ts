import axios, { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../types/api';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';
import type { Plan, StudySession, CreatePlanRequest, CreateStudySessionRequest, UpdateStudySessionRequest, Topic, CreateTopicRequest, UpdateTopicRequest } from '../types/planner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased from 10s to 30s to prevent timeout errors
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Toast debounce to prevent spam
const toastShown = new Set<string>();

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const { state } = JSON.parse(authData);
          if (state?.refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
              refreshToken: state.refreshToken,
            });

            const { accessToken, refreshToken } = response.data.data.tokens;

            // Update tokens in localStorage
            const updatedAuthData = {
              ...JSON.parse(authData),
              state: {
                ...state,
                accessToken,
                refreshToken,
              },
            };
            localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle common errors with debouncing
    let errorMessage = '';
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

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', credentials),

  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),

  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/auth/logout'),

  getMe: (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.get('/auth/me'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.put('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<ApiResponse>> =>
    api.put('/auth/change-password', data),

  refreshToken: (refreshToken: string): Promise<AxiosResponse<ApiResponse<{ tokens: any }>>> =>
    api.post('/auth/refresh-token', { refreshToken }),
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

  updateSession: (id: string, data: UpdateStudySessionRequest): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.put(`/study-sessions/${id}`, data),

  deleteSession: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/study-sessions/${id}`),

  startSession: (id: string): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${id}/start`),

  pauseSession: (id: string): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${id}/pause`),

  completeSession: (id: string, data?: { notes?: string; productivity?: number }): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${id}/complete`, data),
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
  getSettings: (): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.get('/settings'),

  updateSettings: (data: any): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.put('/settings', data),

  getSettingsByCategory: (category: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    api.get(`/settings/category/${category}`),
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
