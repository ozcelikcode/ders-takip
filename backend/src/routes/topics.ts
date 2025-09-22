import express from 'express';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  res.json({ success: true, message: 'Topics endpoint - coming soon' });
});

export default router;