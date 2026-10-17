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
import { protect } from '../middleware/auth';
import { requireTrustedAuthRequest } from '../middleware/authCookies';
import {
  changePasswordSchema,
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
