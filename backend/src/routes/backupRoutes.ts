import { Router } from 'express';
import * as backupController from '../controllers/backupController';
import { protect, authorize } from '../middleware/auth';

import { resetDataSchema, catalogPathIdSchema } from '@study-tracker/contracts';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// All backup routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/', backupController.getBackups);
router.post('/create', backupController.createManualBackup);
router.post(
  '/restore/:id',
  validate(z.object({ params: z.object({ id: catalogPathIdSchema }) })),
  backupController.restoreBackup,
);
router.post(
  '/reset',
  validate(z.object({ body: resetDataSchema })),
  backupController.resetData,
);

export default router;
