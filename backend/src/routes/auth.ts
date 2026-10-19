import express from 'express';
import {
  changePassword,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  updateProfile,
} from '../controllers/authController';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth';
import { getEnvironment } from '../config/environment';
import { completePasswordReset, forgotPassword } from '../controllers/passwordResetController';
import { requireTrustedAuthRequest } from '../middleware/authCookies';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  loginSchema,
  registerSchema,
  profilePatchSchema,
} from '@study-tracker/contracts';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = express.Router();
router.use(requireTrustedAuthRequest);

router.post(
  '/register',
  validate(z.object({ body: registerSchema })),
  register,
);

router.post('/login', validate(z.object({ body: loginSchema })), login);

// Reset requests are cheap to send and expensive to receive, so they get their own budget.
const resetLimiter =
  getEnvironment().NODE_ENV === 'production'
    ? [rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, error: { message: 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.' } } })]
    : [];
router.post('/forgot-password', ...resetLimiter, validate(z.object({ body: forgotPasswordSchema })), forgotPassword);
router.post('/reset-password', ...resetLimiter, validate(z.object({ body: resetPasswordSchema })), completePasswordReset);

router.post('/refresh-token', refreshToken);

router.post('/logout', logout);

router.get('/me', protect, getMe);

router.put(
  '/profile',
  protect,
  validate(z.object({ body: profilePatchSchema })),
  updateProfile,
);

router.put(
  '/change-password',
  protect,
  validate(z.object({ body: changePasswordSchema })),
  changePassword,
);

export default router;
