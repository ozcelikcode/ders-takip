import express from 'express';
import { getSettings, updateSettings, getAdminSettings } from '../controllers/settingsController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Settings are public for reading (site theme, colors, etc)
// Only updates require admin auth
router.get('/', getSettings);
router.get('/admin', protect, authorize('admin'), getAdminSettings);

// Admin only routes
router.put('/', protect, authorize('admin'), updateSettings);

export default router;