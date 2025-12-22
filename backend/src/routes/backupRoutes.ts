import { Router } from 'express';
import * as backupController from '../controllers/backupController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// All backup routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/', backupController.getBackups);
router.post('/create', backupController.createManualBackup);
router.post('/restore/:id', backupController.restoreBackup);
router.post('/reset', backupController.resetData);

export default router;
