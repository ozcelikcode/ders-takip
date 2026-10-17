import { z } from 'zod';
import type { UserStudySummary } from './studyTracking.js';

export const userRoleSchema = z.enum(['student', 'admin']);
export const createManagedUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(20)
      .regex(/^[A-Za-z0-9]+$/),
    email: z.email(),
    password: z
      .string()
      .min(12)
      .refine((value) => new TextEncoder().encode(value).length <= 72),
    firstName: z.string().trim().min(2).max(50),
    lastName: z.string().trim().min(2).max(50),
    role: userRoleSchema.default('student'),
    isActive: z.boolean().default(true),
  })
  .strict();
export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type ManagedUserPatch = {
  role?: z.infer<typeof userRoleSchema>;
  isActive?: boolean;
};
export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: z.infer<typeof userRoleSchema>;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string | null;
  stats?: UserStudySummary;
}
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
