import { z } from 'zod';
import { preferencesPatchSchema, preferencesSchema } from './preferences.js';
import { catalogPathIdSchema } from './catalog.js';
import {
  userStudySummarySchema,
  type UserStudySummary,
} from './studyTracking.js';
import { sessionStatusSchema } from './studySessions.js';
import { adminPasswordSchema } from './adminAudit.js';
import type { AccountReferences, accountExportFormat, accountExportVersion } from './accountImport.js';

export const userRoleSchema = z.enum(['student', 'admin']);
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'usernameLength')
  .max(20, 'usernameLength')
  .regex(
    /^[A-Za-z0-9]+$/,
    'usernameCharacters',
  );
export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'nameLength')
  .max(50, 'nameLength');
export const newPasswordSchema = z
  .string()
  .min(12, 'passwordLength')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'passwordBytes',
  );
/** The fields of a new account; registration and administrator-created accounts both start from these. */
export const accountFieldsSchema = z
  .object({
    username: usernameSchema,
    email: z.email({ error: 'email' }),
    password: newPasswordSchema,
    firstName: personNameSchema,
    lastName: personNameSchema,
    role: userRoleSchema.default('student'),
    isActive: z.boolean().default(true),
  })
  .strict();
export const createManagedUserSchema = accountFieldsSchema
  // Creating an administrator grants administration, so it asks for the creator's password like a role change.
  .extend({ adminPassword: adminPasswordSchema.optional() })
  .refine((value) => value.role !== 'admin' || value.adminPassword !== undefined, { path: ['adminPassword'], message: 'passwordRequired' });
export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export const managedUserPatchSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    preferences: preferencesPatchSchema.optional(),
    // A role change asks for the administrator's password.
    adminPassword: adminPasswordSchema.optional(),
  })
  .strict()
  .refine(
    ({ adminPassword: _confirmation, ...changes }) => Object.keys(changes).length > 0,
    'nothingToUpdate',
  )
  .refine((value) => value.role === undefined || value.adminPassword !== undefined, { path: ['adminPassword'], message: 'passwordRequired' });
export type ManagedUserPatch = z.infer<typeof managedUserPatchSchema>;
export const userListQuerySchema = z
  .object({
    page: catalogPathIdSchema.default('1'),
    limit: catalogPathIdSchema
      .refine((value) => Number(value) <= 200)
      .default('10'),
    search: z.string().trim().max(200).optional(),
    role: userRoleSchema.optional(),
    isActive: z.enum(['true', 'false', 'all']).optional(),
    includeStats: z.enum(['true', 'false']).optional(),
    sortBy: z
      .enum([
        'createdAt',
        'updatedAt',
        'firstName',
        'lastName',
        'username',
        'email',
        'role',
        'lastLogin',
      ])
      .default('createdAt'),
    sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).default('DESC'),
  })
  .strict()
  .refine(
    (value) =>
      Number.isSafeInteger((Number(value.page) - 1) * Number(value.limit)),
    'invalid',
  );
export type ManagedUser = Pick<
  UserResponse,
  | 'id'
  | 'username'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'role'
  | 'isActive'
  | 'createdAt'
  | 'lastLogin'
> & { stats?: UserStudySummary | undefined };
export interface ManagedUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: ManagedUser['role'];
  isActive?: boolean | 'all';
  includeStats?: boolean;
}
export interface ManagedUserList {
  users: ManagedUser[];
  pagination: { current: number; pages: number; total: number; limit: number };
}

export const userResponseSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  profileImage: z.string().nullable().optional(),
  preferences: preferencesSchema,
  userCategory: z
    .enum([
      'student',
      'teacher',
      'employee',
      'developer',
      'freelancer',
      'other',
    ])
    .nullable()
    .optional(),
  lastLogin: z.iso.datetime().nullable().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().optional(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;
export const managedUserListResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    users: z.array(
      userResponseSchema.extend({ stats: userStudySummarySchema.optional() }),
    ),
    pagination: z.object({
      current: z.number().int().positive(),
      pages: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive().max(200),
    }),
  }),
});
export const adminOverviewResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    overview: z.object({
      users: z.object({
        total: z.number().int().nonnegative(),
        active: z.number().int().nonnegative(),
      }),
      courses: z.object({
        total: z.number().int().nonnegative(),
        active: z.number().int().nonnegative(),
      }),
      sessions: userStudySummarySchema,
      recentSessions: z.array(
        z.object({
          id: z.number().int().positive(),
          title: z.string(),
          status: sessionStatusSchema,
          sessionType: z.string(),
          duration: z.number(),
          userName: z.string(),
        }),
      ),
    }),
  }),
});

/** Self-service account deletion is confirmed with the current password. */
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'passwordRequired') }).strict();
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** The user's own data as plain JSON; record shapes follow the stored rows and may gain fields over time. */
export interface AccountExport {
  format: typeof accountExportFormat;
  version: typeof accountExportVersion;
  exportedAt: string;
  account: UserResponse;
  categories: unknown[];
  courses: unknown[];
  topicProgress: unknown[];
  sessions: unknown[];
  plans: unknown[];
  /** Weekly routines; their sessions are in `sessions` with a matching `seriesId`. */
  routines: unknown[];
  /** Personal weekly targets per record, in measured minutes. */
  courseGoals: unknown[];
  /** The person's tags and where they are attached. */
  tags: unknown;
  /** Shared records the data above points at, so another site can match them by name. */
  references: AccountReferences;
}
