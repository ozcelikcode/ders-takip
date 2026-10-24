import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { adminAuditQuerySchema } from '@study-tracker/contracts';
import { authorize, protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { listAdminEvents } from '../services/adminAudit';

const router = Router();

// The administrator log is read-only over HTTP; entries are only ever appended by the actions themselves.
router.get('/', protect, authorize('admin'), validate(z.object({ query: adminAuditQuerySchema })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { before, limit } = req.query as z.infer<typeof adminAuditQuerySchema>;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: await listAdminEvents({ before: before === undefined ? undefined : Number(before), limit: Number(limit) }) });
  } catch (error) {
    next(error);
  }
});

export default router;
