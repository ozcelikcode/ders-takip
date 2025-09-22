import express from 'express';
import { getSettings, updateSettings, getSettingsByCategory } from '../controllers/settingsController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All settings routes require admin auth
router.use(protect, authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/category/:category', getSettingsByCategory);

export default router;