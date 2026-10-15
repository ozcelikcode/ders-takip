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
changePasswordSchema,loginSchema,
registerSchema,updateProfileSchema,validateRequest
} from '../utils/validation';

const router = express.Router();
router.use(requireTrustedAuthRequest);

router.post('/register', validateRequest(registerSchema), register);

router.post('/login', validateRequest(loginSchema), login);

router.post('/refresh-token', refreshToken);

router.post('/logout', logout);

router.get('/me', protect, getMe);

router.put('/profile', protect, validateRequest(updateProfileSchema), updateProfile);

router.put('/change-password', protect, validateRequest(changePasswordSchema), changePassword);

export default router;