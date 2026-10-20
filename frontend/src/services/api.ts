import {
  authResponseSchema,
  profileResponseSchema,
  managedUserListResponseSchema,
  adminOverviewResponseSchema,
  backupListResponseSchema,
  backupRestoreResponseSchema,
  backupCreateResponseSchema,
  resetDataResponseSchema,
  type ChangePasswordInput,
} from '@study-tracker/contracts';
import type { BackupRecord, ResetMode } from '../types/backup';
import type {
  CreateManagedUserInput,
  ManagedUserList,
  ManagedUserListParams,
  ManagedUserPatch,
} from '@study-tracker/contracts';
import type {
  SiteSettings,
  PublicSettings,
  SettingsPatch,
  SessionStats,
  AdminOverview,
  SessionQuery,
  ActivityKind,
  CreateCourseInput,
  UpdateCourseInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderTopicsInput,
  TopicProgressEntry,
  TopicProgressStatus,
} from '@study-tracker/contracts';
import type { ProfileUpdate } from '../types/auth';
import type { PomodoroCommand } from '@study-tracker/contracts';
import { withAuthLock } from '../lib/authLock';
import axios, { AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types/api';
import type { CatalogCategoryRecord, CatalogCourse, CatalogTopic } from '../types/catalog';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '../types/auth';
import type {
  CreateStudySessionRequest,
  CreateTopicRequest,
  StudySession,
  UpdateStudySessionRequest,
  UpdateTopicRequest,
} from '../types/planner';
import { useUserPreferencesStore } from '../store/userPreferencesStore';

import {
  forgotPasswordResponseSchema,
  passwordResetLinkSchema,
  searchResultSchema,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
  type PasswordResetLink,
  type ResetPasswordInput,
  type SearchResult,
  type CompleteOnboardingInput,
  type AccountExport,
  type DeleteAccountInput,
  notificationChannelsSchema,
  type NotificationChannels,
  type TestNotificationInput,
} from '@study-tracker/contracts';
import { api, authTransport } from './httpClient';

const parseAuthResponse = (
  response: AxiosResponse<unknown>,
): AxiosResponse<AuthResponse> => {
  const parsed = authResponseSchema.parse(response.data);
  return {
    ...response,
    data: {
      ...parsed,
      data: {
        ...parsed.data,
        user: { ...parsed.data.user, id: String(parsed.data.user.id) },
      },
    },
  };
};
const parseProfileResponse = (
  response: AxiosResponse<unknown>,
): AxiosResponse<ApiResponse<{ user: User }>> => {
  const parsed = profileResponseSchema.parse(response.data);
  return {
    ...response,
    data: {
      success: parsed.success,
      ...(parsed.message === undefined ? {} : { message: parsed.message }),
      data: { user: { ...parsed.data.user, id: String(parsed.data.user.id) } },
    },
  };
};

let profileQueue: Promise<unknown> = Promise.resolve();
const updateProfile = (
  data: ProfileUpdate,
): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
  const epoch = useAuthStore.getState().epoch;
  const operation = profileQueue
    .catch(() => undefined)
    .then(() => {
      if (useAuthStore.getState().epoch !== epoch)
        throw new axios.CanceledError('Account changed before profile update');
      return api.put<unknown>('/auth/profile', data).then(parseProfileResponse);
    });
  profileQueue = operation;
  return operation;
};

// Auth API
export const authAPI = {
  login: (
    credentials: LoginCredentials,
  ): Promise<AxiosResponse<AuthResponse>> =>
    withAuthLock(() =>
      authTransport.post('/auth/login', credentials).then(parseAuthResponse),
    ),

  register: (data: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    withAuthLock(() =>
      authTransport.post('/auth/register', data).then(parseAuthResponse),
    ),

  // Public reset endpoints use the cookie-free auth transport; neither touches the session.
  forgotPassword: async (input: ForgotPasswordInput): Promise<ForgotPasswordResponse> =>
    forgotPasswordResponseSchema.parse(
      (await authTransport.post<{ data: unknown }>('/auth/forgot-password', input)).data.data,
    ),
  resetPassword: (input: ResetPasswordInput): Promise<AxiosResponse<ApiResponse>> =>
    authTransport.post('/auth/reset-password', input),

  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    withAuthLock(() => authTransport.post('/auth/logout')),

  updateProfile,

  changePassword: (
    data: ChangePasswordInput,
  ): Promise<AxiosResponse<ApiResponse>> => {
    const epoch = useAuthStore.getState().epoch;
    return api.put('/auth/change-password', data).then((response) => {
      if (useAuthStore.getState().epoch === epoch)
        useAuthStore.getState().logout();
      return response;
    });
  },

  /** The user's own data as the server's export document. */
  exportAccount: async (): Promise<AccountExport> =>
    (await api.get<AccountExport>('/auth/account/export')).data,

  deleteAccount: (input: DeleteAccountInput): Promise<AxiosResponse<ApiResponse>> =>
    api.delete('/auth/account', { data: input }),

  refreshToken: (): Promise<AxiosResponse<AuthResponse>> =>
    withAuthLock(() =>
      authTransport.post('/auth/refresh-token').then(parseAuthResponse),
    ),
};

type QueryParams = Record<string, string | number | boolean>;

// Courses API
export const coursesAPI = {
  getCourses: (params?: QueryParams): Promise<AxiosResponse<ApiResponse<{ courses: CatalogCourse[] }>>> =>
    api.get('/courses', { params }),

  getCourse: (id: string, params?: QueryParams): Promise<AxiosResponse<ApiResponse<{ course: CatalogCourse }>>> =>
    api.get(`/courses/${id}`, { params }),

  createCourse: (
    data: CreateCourseInput,
  ): Promise<AxiosResponse<ApiResponse>> => api.post('/courses', data),

  updateCourse: (
    id: string,
    data: UpdateCourseInput,
  ): Promise<AxiosResponse<ApiResponse>> => api.put(`/courses/${id}`, data),

  deleteCourse: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/courses/${id}`),

  getCourseTopics: (
    id: string,
    params?: QueryParams,
  ): Promise<AxiosResponse<ApiResponse<{ topics: CatalogTopic[] }>>> =>
    api.get(`/courses/${id}/topics`, { params }),
};

// Categories API
export const categoriesAPI = {
  getCategories: (params?: QueryParams): Promise<AxiosResponse<ApiResponse<{ categories: CatalogCategoryRecord[] }>>> =>
    api.get('/categories', { params }),

  createCategory: (
    data: CreateCategoryInput,
  ): Promise<AxiosResponse<ApiResponse>> => api.post('/categories', data),

  updateCategory: (
    id: string,
    data: UpdateCategoryInput,
  ): Promise<AxiosResponse<ApiResponse>> => api.put(`/categories/${id}`, data),

  deleteCategory: (
    id: string,
    migrateToCategoryId?: number,
  ): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/categories/${id}`, { data: { migrateToCategoryId } }),
};

// Users API (Admin)
export const usersAPI = {
  createPasswordResetLink: async (id: string): Promise<PasswordResetLink> =>
    passwordResetLinkSchema.parse(
      (await api.post<{ data: unknown }>(`/users/${id}/password-reset-link`)).data.data,
    ),

  getAdminOverview: (): Promise<
    AxiosResponse<ApiResponse<{ overview: AdminOverview }>>
  > =>
    api.get('/users/admin-stats').then((response) => ({
      ...response,
      data: adminOverviewResponseSchema.parse(response.data),
    })),

  getUsers: (
    params?: ManagedUserListParams,
  ): Promise<AxiosResponse<ApiResponse<ManagedUserList>>> =>
    api.get('/users', { params }).then((response) => ({
      ...response,
      data: managedUserListResponseSchema.parse(response.data),
    })),

  createUser: (
    data: CreateManagedUserInput,
  ): Promise<AxiosResponse<ApiResponse>> => api.post('/users', data),

  updateUser: (
    id: string,
    data: ManagedUserPatch,
  ): Promise<AxiosResponse<ApiResponse>> => api.put(`/users/${id}`, data),

  deleteUser: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/users/${id}`),
};

// Study Sessions API
export const studySessionsAPI = {
  controlPomodoro: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    input: Omit<PomodoroCommand, 'expectedUpdatedAt'>,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post(`/study-sessions/${session.id}/pomodoro`, {
      ...input,
      expectedUpdatedAt: session.updatedAt,
    }),
  getSessions: (
    params?: SessionQuery,
  ): Promise<AxiosResponse<ApiResponse<{ sessions: StudySession[] }>>> =>
    api.get('/study-sessions', {
      params: {
        ...params,
        timezone: useUserPreferencesStore.getState().preferences.timezone,
      },
    }),

  getStats: (
    params?: SessionQuery,
  ): Promise<AxiosResponse<ApiResponse<{ stats: SessionStats }>>> =>
    api.get('/study-sessions/stats', {
      params: {
        ...params,
        timezone: useUserPreferencesStore.getState().preferences.timezone,
      },
    }),

  getSession: (
    id: string,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.get(`/study-sessions/${id}`),

  createSession: (
    data: CreateStudySessionRequest,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post('/study-sessions', data),

  updateSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    data: UpdateStudySessionRequest,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.put(`/study-sessions/${session.id}`, {
      ...data,
      expectedUpdatedAt: session.updatedAt,
    }),

  deleteSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
  ): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/study-sessions/${session.id}`, {
      data: { expectedUpdatedAt: session.updatedAt },
    }),

  startSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    activityKind?: ActivityKind,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/start`, {
      expectedUpdatedAt: session.updatedAt,
      ...(activityKind === undefined ? {} : { activityKind }),
    }),

  pauseSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/pause`, {
      expectedUpdatedAt: session.updatedAt,
    }),

  completeSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    data?: { notes?: string; productivity?: number },
  ): Promise<AxiosResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/complete`, {
      ...data,
      expectedUpdatedAt: session.updatedAt,
    }),
};

// Topics API
export const topicsAPI = {
  createTopic: (
    data: CreateTopicRequest,
  ): Promise<AxiosResponse<ApiResponse<{ topic: CatalogTopic }>>> =>
    api.post('/topics', data),

  updateTopic: (
    id: string,
    data: UpdateTopicRequest,
  ): Promise<AxiosResponse<ApiResponse<{ topic: CatalogTopic }>>> =>
    api.put(`/topics/${id}`, data),

  deleteTopic: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete(`/topics/${id}`),

  getTopicProgress: (): Promise<
    AxiosResponse<ApiResponse<{ progress: TopicProgressEntry[] }>>
  > => api.get('/topics/progress'),

  setTopicProgress: (
    id: number,
    status: TopicProgressStatus,
  ): Promise<
    AxiosResponse<
      ApiResponse<{
        progress: {
          topicId: number;
          courseId: number;
          status: TopicProgressStatus;
        };
      }>
    >
  > => api.put(`/topics/${id}/progress`, { status }),

  reorderTopics: (
    courseId: string,
    data: ReorderTopicsInput,
  ): Promise<AxiosResponse<ApiResponse<{ topics: CatalogTopic[] }>>> =>
    api.put(`/topics/course/${courseId}/reorder`, data),
};

// Settings API
export const notificationsAPI = {
  channels: async (): Promise<NotificationChannels> =>
    notificationChannelsSchema.parse((await api.get<{ data: unknown }>('/notifications/channels')).data.data),
  subscribe: (subscription: PushSubscriptionJSON): Promise<AxiosResponse<ApiResponse>> =>
    api.post('/notifications/push-subscriptions', subscription),
  unsubscribe: (endpoint: string): Promise<AxiosResponse<ApiResponse>> =>
    api.delete('/notifications/push-subscriptions', { data: { endpoint } }),
  test: (input: TestNotificationInput): Promise<AxiosResponse<ApiResponse<{ delivered: number }>>> =>
    api.post('/notifications/test', input),
};

export const onboardingAPI = {
  complete: (input: CompleteOnboardingInput): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    api.post<unknown>('/onboarding', input).then(parseProfileResponse),
};

export const searchAPI = {
  search: async (q: string): Promise<SearchResult> =>
    searchResultSchema.parse((await api.get<{ data: unknown }>('/search', { params: { q } })).data.data),
};

export const settingsAPI = {
  getSettings: (): Promise<AxiosResponse<ApiResponse<PublicSettings>>> =>
    api.get('/settings'),

  updateSettings: (
    data: SettingsPatch,
  ): Promise<AxiosResponse<ApiResponse<SiteSettings>>> =>
    api.put('/settings', data),

  getAdminSettings: (): Promise<AxiosResponse<ApiResponse<SiteSettings>>> =>
    api.get('/settings/admin'),
};

// Backup API
export const backupAPI = {
  getBackups: (): Promise<AxiosResponse<ApiResponse<BackupRecord[]>>> =>
    api.get('/backup').then((response) => ({
      ...response,
      data: backupListResponseSchema.parse(response.data),
    })),

  createBackup: (): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.post('/backup/create').then((response) => ({
      ...response,
      data: backupCreateResponseSchema.parse(response.data),
    })),

  restoreBackup: (id: number): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api
      .post(`/backup/restore/${id}`)
      .then((response) => ({
        ...response,
        data: backupRestoreResponseSchema.parse(response.data),
      })),

  resetData: (
    mode: ResetMode,
  ): Promise<AxiosResponse<ApiResponse<{ safetyBackupId: number }>>> =>
    api.post('/backup/reset', { mode }).then((response) => ({
      ...response,
      data: resetDataResponseSchema.parse(response.data),
    })),
};

export default api;
