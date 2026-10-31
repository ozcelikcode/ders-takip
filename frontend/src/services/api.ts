import {
  authResponseSchema,
  profileResponseSchema,
  managedUserListResponseSchema,
  adminOverviewResponseSchema,
  backupListResponseSchema,
  backupRestoreResponseSchema,
  backupCreateResponseSchema,
  resetDataResponseSchema,
  adminAuditListResponseSchema,
  seriesListResponseSchema,
  seriesWriteResponseSchema,
  courseGoalListResponseSchema,
  courseGoalResponseSchema,
  calendarFeedCreatedResponseSchema,
  calendarFeedStatusResponseSchema,
  tagListResponseSchema,
  accountImportResponseSchema,
  type AccountImportResult,
  tagResponseSchema,
  type CourseGoal,
  type ChangePasswordInput,
  type CreateSeriesInput,
  type LogStudyInput,
  type SeriesRecord,
  type UpdateSeriesInput,
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
  otherSessionsResponseSchema,
  signOutOthersResponseSchema,
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
import { api, authTransport, receiveAuthResponse } from './httpClient';
import { takeInitialSessionRefresh } from '../lib/initialSessionRefresh';
import { CanceledError, HttpError, type HttpResponse } from './httpError';

const parseAuthResponse = (
  response: HttpResponse<unknown>,
): HttpResponse<AuthResponse> => {
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
  response: HttpResponse<unknown>,
): HttpResponse<ApiResponse<{ user: User }>> => {
  const parsed = profileResponseSchema.parse(response.data);
  return {
    ...response,
    data: {
      success: parsed.success,
      data: { user: { ...parsed.data.user, id: String(parsed.data.user.id) } },
    },
  };
};

/** A browser without a session cookie gets 204 from the refresh route; the app treats it like an expired session. */
const parseSessionResponse = (response: HttpResponse<unknown>): HttpResponse<AuthResponse> => {
  if (response.status === 204)
    throw new HttpError('No session to restore', { status: 401, data: { success: false, error: { code: 'sessionExpired' } } }, response.config, 'ERR_BAD_RESPONSE');
  return parseAuthResponse(response);
};

let profileQueue: Promise<unknown> = Promise.resolve();
const updateProfile = (
  data: ProfileUpdate,
): Promise<HttpResponse<ApiResponse<{ user: User }>>> => {
  const epoch = useAuthStore.getState().epoch;
  const operation = profileQueue
    .catch(() => undefined)
    .then(() => {
      if (useAuthStore.getState().epoch !== epoch)
        throw new CanceledError('Account changed before profile update');
      return api.put<unknown>('/auth/profile', data).then(parseProfileResponse);
    });
  profileQueue = operation;
  return operation;
};

// Auth API
export const authAPI = {
  login: (
    credentials: LoginCredentials,
  ): Promise<HttpResponse<AuthResponse>> =>
    withAuthLock(() =>
      authTransport.post('/auth/login', credentials).then(parseAuthResponse),
    ),

  register: (data: RegisterData): Promise<HttpResponse<AuthResponse>> =>
    withAuthLock(() =>
      authTransport.post('/auth/register', data).then(parseAuthResponse),
    ),

  // Public reset endpoints use the cookie-free auth transport; neither touches the session.
  forgotPassword: async (input: ForgotPasswordInput): Promise<ForgotPasswordResponse> =>
    forgotPasswordResponseSchema.parse(
      (await authTransport.post<{ data: unknown }>('/auth/forgot-password', input)).data.data,
    ),
  resetPassword: (input: ResetPasswordInput): Promise<HttpResponse<ApiResponse>> =>
    authTransport.post('/auth/reset-password', input),

  logout: (): Promise<HttpResponse<ApiResponse>> =>
    withAuthLock(() => authTransport.post('/auth/logout')),

  updateProfile,

  changePassword: (
    data: ChangePasswordInput,
  ): Promise<HttpResponse<ApiResponse>> => {
    const epoch = useAuthStore.getState().epoch;
    return api.put<ApiResponse>('/auth/change-password', data).then((response) => {
      if (useAuthStore.getState().epoch === epoch)
        useAuthStore.getState().logout();
      return response;
    });
  },

  /** The user's own data as the server's export document. */
  exportAccount: async (): Promise<AccountExport> =>
    (await api.get<AccountExport>('/auth/account/export')).data,

  /** Loads an export into this empty account; answers with what was created and the account it changed. */
  importAccount: async (file: unknown): Promise<{ result: AccountImportResult; user: User }> => {
    const parsed = accountImportResponseSchema.parse((await api.post('/auth/account/import', file)).data);
    return { result: parsed.data.result, user: { ...parsed.data.user, id: String(parsed.data.user.id) } };
  },

  deleteAccount: (input: DeleteAccountInput): Promise<HttpResponse<ApiResponse>> =>
    api.delete('/auth/account', { data: input }),

  /** How many other signed-in sessions the account has; this one is not counted. */
  otherSessions: async (): Promise<number> =>
    otherSessionsResponseSchema.parse((await api.get('/auth/sessions')).data).data.others,
  signOutOthers: async (): Promise<number> =>
    signOutOthersResponseSchema.parse((await api.post('/auth/sessions/sign-out-others')).data).data.signedOut,

  refreshToken: (): Promise<HttpResponse<AuthResponse>> => {
    const early = takeInitialSessionRefresh();
    return early
      ? receiveAuthResponse(early, { url: '/auth/refresh-token', method: 'post' }).then(parseSessionResponse)
      : withAuthLock(() =>
        authTransport.post('/auth/refresh-token').then(parseSessionResponse),
      );
  },
};

type QueryParams = Record<string, string | number | boolean>;

// Courses API
export const coursesAPI = {
  getCourses: (params?: QueryParams): Promise<HttpResponse<ApiResponse<{ courses: CatalogCourse[] }>>> =>
    api.get('/courses', { params }),

  getCourse: (id: string, params?: QueryParams): Promise<HttpResponse<ApiResponse<{ course: CatalogCourse }>>> =>
    api.get(`/courses/${id}`, { params }),

  createCourse: (
    data: CreateCourseInput,
  ): Promise<HttpResponse<ApiResponse>> => api.post('/courses', data),

  updateCourse: (
    id: string,
    data: UpdateCourseInput,
  ): Promise<HttpResponse<ApiResponse>> => api.put(`/courses/${id}`, data),

  deleteCourse: (id: string): Promise<HttpResponse<ApiResponse>> =>
    api.delete(`/courses/${id}`),

  getCourseTopics: (
    id: string,
    params?: QueryParams,
  ): Promise<HttpResponse<ApiResponse<{ topics: CatalogTopic[] }>>> =>
    api.get(`/courses/${id}/topics`, { params }),
};

// Categories API
export const categoriesAPI = {
  getCategories: (params?: QueryParams): Promise<HttpResponse<ApiResponse<{ categories: CatalogCategoryRecord[] }>>> =>
    api.get('/categories', { params }),

  createCategory: (
    data: CreateCategoryInput,
  ): Promise<HttpResponse<ApiResponse>> => api.post('/categories', data),

  updateCategory: (
    id: string,
    data: UpdateCategoryInput,
  ): Promise<HttpResponse<ApiResponse>> => api.put(`/categories/${id}`, data),

  deleteCategory: (
    id: string,
    migrateToCategoryId?: number,
  ): Promise<HttpResponse<ApiResponse>> =>
    api.delete(`/categories/${id}`, { data: { migrateToCategoryId } }),
};

// Users API (Admin)
export const usersAPI = {
  createPasswordResetLink: async (id: string, adminPassword?: string): Promise<PasswordResetLink> =>
    passwordResetLinkSchema.parse(
      (await api.post<{ data: unknown }>(`/users/${id}/password-reset-link`, adminPassword === undefined ? {} : { adminPassword })).data.data,
    ),

  getAdminOverview: (): Promise<
    HttpResponse<ApiResponse<{ overview: AdminOverview }>>
  > =>
    api.get('/users/admin-stats').then((response) => ({
      ...response,
      data: adminOverviewResponseSchema.parse(response.data),
    })),

  getUsers: (
    params?: ManagedUserListParams,
  ): Promise<HttpResponse<ApiResponse<ManagedUserList>>> =>
    api.get('/users', { params }).then((response) => ({
      ...response,
      data: managedUserListResponseSchema.parse(response.data),
    })),

  createUser: (
    data: CreateManagedUserInput,
  ): Promise<HttpResponse<ApiResponse>> => api.post('/users', data),

  updateUser: (
    id: string,
    data: ManagedUserPatch,
  ): Promise<HttpResponse<ApiResponse>> => api.put(`/users/${id}`, data),

  /** Deleting an account is confirmed with the administrator's password. */
  deleteUser: (id: string, adminPassword: string): Promise<HttpResponse<ApiResponse>> =>
    api.delete(`/users/${id}`, { data: { adminPassword } }),
};

/** The append-only administrator log, newest first. */
export const adminAuditAPI = {
  list: async (before?: number) =>
    adminAuditListResponseSchema.parse((await api.get('/admin-audit', { params: before === undefined ? {} : { before } })).data).data,
};

// Study Sessions API
// The person's tags; attaching replaces their tags on one record or session.
export const tagsAPI = {
  list: async () => tagListResponseSchema.parse((await api.get('/tags')).data).data,
  create: async (name: string) => tagResponseSchema.parse((await api.post('/tags', { name })).data).data.tag,
  rename: async (id: number, name: string) => tagResponseSchema.parse((await api.put(`/tags/${id}`, { name })).data).data.tag,
  remove: async (id: number) => {
    await api.delete(`/tags/${id}`);
  },
  setCourseTags: async (courseId: number, tagIds: number[]) => {
    await api.put(`/tags/courses/${courseId}`, { tagIds });
  },
  setSessionTags: async (sessionId: number, tagIds: number[]) => {
    await api.put(`/tags/sessions/${sessionId}`, { tagIds });
  },
};

// The calendar subscription; its address comes back only when it is created or renewed.
export const calendarFeedAPI = {
  status: async () => calendarFeedStatusResponseSchema.parse((await api.get('/calendar-feed')).data).data,
  create: async () => calendarFeedCreatedResponseSchema.parse((await api.post('/calendar-feed')).data).data,
  remove: async () => {
    await api.delete('/calendar-feed');
  },
};

// Personal weekly targets per record; the records themselves are never changed.
export const courseGoalsAPI = {
  list: async (): Promise<CourseGoal[]> =>
    courseGoalListResponseSchema.parse((await api.get('/course-goals')).data).data.goals,
  set: async (courseId: number, weeklyMinutes: number): Promise<CourseGoal> =>
    courseGoalResponseSchema.parse((await api.put(`/course-goals/${courseId}`, { weeklyMinutes })).data).data.goal,
  clear: async (courseId: number) => {
    await api.delete(`/course-goals/${courseId}`);
  },
};

// Weekly routines; their sessions arrive through studySessionsAPI like any other.
export const seriesAPI = {
  list: async (): Promise<SeriesRecord[]> =>
    seriesListResponseSchema.parse((await api.get('/session-series')).data).data.series,
  create: async (input: CreateSeriesInput) =>
    seriesWriteResponseSchema.parse((await api.post('/session-series', input)).data).data,
  update: async (series: SeriesRecord, input: Omit<UpdateSeriesInput, 'expectedUpdatedAt'>) =>
    seriesWriteResponseSchema.parse((await api.put(`/session-series/${series.id}`, { ...input, expectedUpdatedAt: series.updatedAt })).data).data,
  stop: async (series: SeriesRecord) => {
    await api.delete(`/session-series/${series.id}`, { data: { expectedUpdatedAt: series.updatedAt } });
  },
};

export const studySessionsAPI = {
  controlPomodoro: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    input: Omit<PomodoroCommand, 'expectedUpdatedAt'>,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post(`/study-sessions/${session.id}/pomodoro`, {
      ...input,
      expectedUpdatedAt: session.updatedAt,
    }),
  getSessions: (
    params?: SessionQuery,
  ): Promise<HttpResponse<ApiResponse<{ sessions: StudySession[] }>>> =>
    api.get('/study-sessions', {
      params: {
        ...params,
        timezone: useUserPreferencesStore.getState().preferences.timezone,
      },
    }),

  getStats: (
    params?: SessionQuery,
  ): Promise<HttpResponse<ApiResponse<{ stats: SessionStats }>>> =>
    api.get('/study-sessions/stats', {
      params: {
        ...params,
        timezone: useUserPreferencesStore.getState().preferences.timezone,
      },
    }),

  getSession: (
    id: string,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.get(`/study-sessions/${id}`),

  createSession: (
    data: CreateStudySessionRequest,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post('/study-sessions', data),

  // Study done without the timer, recorded afterwards as measured time.
  logStudy: (
    data: LogStudyInput,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.post('/study-sessions/log', data),

  updateSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    data: UpdateStudySessionRequest,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.put(`/study-sessions/${session.id}`, {
      ...data,
      expectedUpdatedAt: session.updatedAt,
    }),

  deleteSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
  ): Promise<HttpResponse<ApiResponse>> =>
    api.delete(`/study-sessions/${session.id}`, {
      data: { expectedUpdatedAt: session.updatedAt },
    }),

  startSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    activityKind?: ActivityKind,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/start`, {
      expectedUpdatedAt: session.updatedAt,
      ...(activityKind === undefined ? {} : { activityKind }),
    }),

  pauseSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/pause`, {
      expectedUpdatedAt: session.updatedAt,
    }),

  completeSession: (
    session: Pick<StudySession, 'id' | 'updatedAt'>,
    data?: { notes?: string; productivity?: number },
  ): Promise<HttpResponse<ApiResponse<{ session: StudySession }>>> =>
    api.patch(`/study-sessions/${session.id}/complete`, {
      ...data,
      expectedUpdatedAt: session.updatedAt,
    }),
};

// Topics API
export const topicsAPI = {
  createTopic: (
    data: CreateTopicRequest,
  ): Promise<HttpResponse<ApiResponse<{ topic: CatalogTopic }>>> =>
    api.post('/topics', data),

  updateTopic: (
    id: string,
    data: UpdateTopicRequest,
  ): Promise<HttpResponse<ApiResponse<{ topic: CatalogTopic }>>> =>
    api.put(`/topics/${id}`, data),

  deleteTopic: (id: string): Promise<HttpResponse<ApiResponse>> =>
    api.delete(`/topics/${id}`),

  getTopicProgress: (): Promise<
    HttpResponse<ApiResponse<{ progress: TopicProgressEntry[] }>>
  > => api.get('/topics/progress'),

  setTopicProgress: (
    id: number,
    status: TopicProgressStatus,
  ): Promise<
    HttpResponse<
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
  ): Promise<HttpResponse<ApiResponse<{ topics: CatalogTopic[] }>>> =>
    api.put(`/topics/course/${courseId}/reorder`, data),
};

// Settings API
export const notificationsAPI = {
  channels: async (): Promise<NotificationChannels> =>
    notificationChannelsSchema.parse((await api.get<{ data: unknown }>('/notifications/channels')).data.data),
  subscribe: (subscription: PushSubscriptionJSON): Promise<HttpResponse<ApiResponse>> =>
    api.post('/notifications/push-subscriptions', subscription),
  unsubscribe: (endpoint: string): Promise<HttpResponse<ApiResponse>> =>
    api.delete('/notifications/push-subscriptions', { data: { endpoint } }),
  test: (input: TestNotificationInput): Promise<HttpResponse<ApiResponse<{ delivered: number }>>> =>
    api.post('/notifications/test', input),
  markRead: (sessionIds: number[]): Promise<HttpResponse<ApiResponse<{ marked: number }>>> =>
    api.post('/notifications/read', { sessionIds }),
};

export const onboardingAPI = {
  complete: (input: CompleteOnboardingInput): Promise<HttpResponse<ApiResponse<{ user: User }>>> =>
    api.post<unknown>('/onboarding', input).then(parseProfileResponse),
};

export const searchAPI = {
  search: async (q: string): Promise<SearchResult> =>
    searchResultSchema.parse((await api.get<{ data: unknown }>('/search', { params: { q } })).data.data),
};

export const settingsAPI = {
  getSettings: (): Promise<HttpResponse<ApiResponse<PublicSettings>>> =>
    api.get('/settings'),

  updateSettings: (
    data: SettingsPatch,
  ): Promise<HttpResponse<ApiResponse<SiteSettings>>> =>
    api.put('/settings', data),

  getAdminSettings: (): Promise<HttpResponse<ApiResponse<SiteSettings>>> =>
    api.get('/settings/admin'),
};

// Backup API
export const backupAPI = {
  getBackups: (): Promise<HttpResponse<ApiResponse<BackupRecord[]>>> =>
    api.get('/backup').then((response) => ({
      ...response,
      data: backupListResponseSchema.parse(response.data),
    })),

  createBackup: (): Promise<HttpResponse<ApiResponse<unknown>>> =>
    api.post('/backup/create').then((response) => ({
      ...response,
      data: backupCreateResponseSchema.parse(response.data),
    })),

  restoreBackup: (id: number, adminPassword: string): Promise<HttpResponse<ApiResponse<unknown>>> =>
    api
      .post(`/backup/restore/${id}`, { adminPassword })
      .then((response) => ({
        ...response,
        data: backupRestoreResponseSchema.parse(response.data),
      })),

  resetData: (
    mode: ResetMode,
    adminPassword: string,
  ): Promise<HttpResponse<ApiResponse<{ safetyBackupId: number }>>> =>
    api.post('/backup/reset', { mode, adminPassword }).then((response) => ({
      ...response,
      data: resetDataResponseSchema.parse(response.data),
    })),
};

export default api;
