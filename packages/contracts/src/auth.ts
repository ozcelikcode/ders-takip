import { z } from 'zod';
import {
  createManagedUserSchema,
  usernameSchema,
  personNameSchema,
  newPasswordSchema,
  userResponseSchema,
} from './users.js';
import { preferencesPatchSchema } from './preferences.js';

// Public registration cannot grant a role or account status.
export const registerSchema = createManagedUserSchema
  .omit({ role: true, isActive: true })
  .strict();
export const loginSchema = z
  .object({
    email: z.email({ error: 'Geçerli bir e-posta adresi giriniz' }),
    password: z.string().min(1, 'Şifre zorunludur'),
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre zorunludur'),
    newPassword: newPasswordSchema,
  })
  .strict();
export const profileImageSchema = z
  .string()
  .refine((value) => {
    if (value === '') return true;
    if (
      /^data:image\/(?:png|jpe?g|webp|bmp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        value,
      )
    )
      return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Geçerli bir HTTP(S) adresi veya desteklenen resim giriniz')
  .nullable();
export const profilePatchSchema = z
  .object({
    firstName: personNameSchema.optional(),
    lastName: personNameSchema.optional(),
    username: usernameSchema.optional(),
    profileImage: profileImageSchema.optional(),
    preferences: preferencesPatchSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'Güncellenecek alan gerekli',
  );
export const authResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    user: userResponseSchema,
    tokens: z.object({
      accessToken: z.string().min(1),
      expiresIn: z.string().min(1),
    }),
  }),
});
export const profileResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.object({ user: userResponseSchema }),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;
