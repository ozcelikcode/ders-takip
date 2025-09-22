import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../utils/validation';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), register);

router.post('/login', validateRequest(loginSchema), login);

router.post('/refresh-token', validateRequest(refreshTokenSchema), refreshToken);

router.post('/logout', logout);

router.get('/me', protect, getMe);

router.put('/profile', protect, validateRequest(updateProfileSchema), updateProfile);

router.put('/change-password', protect, validateRequest(changePasswordSchema), changePassword);

export default router;