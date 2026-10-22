import { z } from 'zod';
import {
  createManagedUserSchema,
  usernameSchema,
  personNameSchema,
  newPasswordSchema,
  userResponseSchema,
} from './users.js';
import { preferencesPatchSchema } from './preferences.js';
import { languageSchema } from './language.js';
import { timezoneSchema } from './time.js';

// Public registration cannot grant a role or account status.
export const registerSchema = createManagedUserSchema
  .omit({ role: true, isActive: true })
  // The browser's IANA zone and language; without them the server defaults apply.
  .extend({ timezone: timezoneSchema.optional(), language: languageSchema.optional() })
  .strict();
export const loginSchema = z
  .object({
    email: z.email({ error: 'email' }),
    password: z.string().min(1, 'passwordRequired'),
  })
  .strict();
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'currentPasswordRequired'),
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
  }, 'imageAddress')
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
    'nothingToUpdate',
  );
export const authResponseSchema = z.object({
  success: z.literal(true),
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
  data: z.object({ user: userResponseSchema }),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

/** 32 random bytes in base64url. */
export const passwordResetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'resetLinkInvalid');
export const forgotPasswordSchema = z
  .object({ email: z.email({ error: 'email' }) })
  .strict();
export const resetPasswordSchema = z
  .object({ token: passwordResetTokenSchema, password: newPasswordSchema })
  .strict();
/** How a reset link reaches the user; the same answer is given whether or not the account exists. */
export const forgotPasswordResponseSchema = z.object({ delivery: z.enum(['email', 'admin']) });
export const passwordResetLinkSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordResponse = z.infer<typeof forgotPasswordResponseSchema>;
export type PasswordResetLink = z.infer<typeof passwordResetLinkSchema>;
