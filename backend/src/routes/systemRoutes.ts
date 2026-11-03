import { Router, type NextFunction, type Request, type Response } from 'express';
import { authorize, protect } from '../middleware/auth';
import { readSystemStatus } from '../services/systemStatus';

const router = Router();

// Administrators only, and never cached: the answer names server paths and changes by the second.
router.get('/', protect, authorize('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: await readSystemStatus() });
  } catch (error) {
    next(error);
  }
});

export default router;
