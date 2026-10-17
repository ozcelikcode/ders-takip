import { z } from 'zod';
import { preferencesPatchSchema, preferencesSchema } from './preferences.js';
import { catalogPathIdSchema } from './catalog.js';
import {
  userStudySummarySchema,
  type UserStudySummary,
} from './studyTracking.js';
import { sessionStatusSchema } from './studySessions.js';

export const userRoleSchema = z.enum(['student', 'admin']);
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
  .max(20)
  .regex(
    /^[A-Za-z0-9]+$/,
    'Kullanıcı adı yalnızca İngilizce harf ve rakam içerebilir',
  );
export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Ad ve soyad en az 2 karakter olmalıdır')
  .max(50);
export const newPasswordSchema = z
  .string()
  .min(12, 'Şifre en az 12 karakter olmalıdır')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Şifre en fazla 72 UTF-8 baytı olabilir',
  );
export const createManagedUserSchema = z
  .object({
    username: usernameSchema,
    email: z.email({ error: 'Geçerli bir e-posta adresi giriniz' }),
    password: newPasswordSchema,
    firstName: personNameSchema,
    lastName: personNameSchema,
    role: userRoleSchema.default('student'),
    isActive: z.boolean().default(true),
  })
  .strict();
export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export const managedUserPatchSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    preferences: preferencesPatchSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'Güncellenecek alan gerekli',
  );
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
    'Sayfa aralığı geçersiz',
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
