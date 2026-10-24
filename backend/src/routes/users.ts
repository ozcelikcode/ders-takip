import express from 'express';
import {
  createUser,
  deleteUser,
  getAdminOverview,
  getUserStudyStats,
  getUsers,
  updateUser,
} from '../controllers/userController';
import { authorize, protect } from '../middleware/auth';
import { z } from 'zod';
import {
  createManagedUserSchema,
  managedUserPatchSchema,
  userListQuerySchema,
  catalogPathIdSchema,
  adminConfirmationSchema,
} from '@study-tracker/contracts';
import { issuePasswordResetLink } from '../controllers/passwordResetController';
import { validate } from '../middleware/validate';
import { confirmAdminPassword } from '../middleware/adminConfirmation';

const router = express.Router();

router.use(protect);

const params = z.object({ id: catalogPathIdSchema });
router.get(
  '/',
  authorize('admin'),
  validate(z.object({ query: userListQuerySchema })),
  getUsers,
);

router.get('/admin-stats', authorize('admin'), getAdminOverview);
router.get('/:id/stats', validate(z.object({ params })), getUserStudyStats);

router.post(
  '/',
  authorize('admin'),
  validate(z.object({ body: createManagedUserSchema })),
  ...confirmAdminPassword('adminCreate', (req) => req.body.role === 'admin'),
  createUser,
);

router.put(
  '/:id',
  authorize('admin'),
  validate(z.object({ params, body: managedUserPatchSchema })),
  ...confirmAdminPassword('roleChange', (req) => req.body.role !== undefined),
  updateUser,
);

router.post(
  '/:id/password-reset-link',
  authorize('admin'),
  validate(z.object({ params })),
  issuePasswordResetLink,
);

router.delete(
  '/:id',
  authorize('admin'),
  validate(z.object({ params, body: adminConfirmationSchema })),
  ...confirmAdminPassword('userDelete'),
  deleteUser,
);

export default router;
