import { Router } from 'express';
import * as backupController from '../controllers/backupController';
import { protect, authorize } from '../middleware/auth';

import { adminConfirmationSchema, resetDataSchema, catalogPathIdSchema } from '@study-tracker/contracts';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { confirmAdminPassword } from '../middleware/adminConfirmation';

const router = Router();

// All backup routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/', backupController.getBackups);
router.post('/create', backupController.createManualBackup);
router.post(
  '/restore/:id',
  validate(z.object({ params: z.object({ id: catalogPathIdSchema }), body: adminConfirmationSchema })),
  ...confirmAdminPassword('backupRestore'),
  backupController.restoreBackup,
);
router.post(
  '/reset',
  validate(z.object({ body: resetDataSchema })),
  ...confirmAdminPassword('dataReset'),
  backupController.resetData,
);

export default router;
