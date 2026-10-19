import { searchQuerySchema } from '@study-tracker/contracts';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { search } from '../services/search';

const router = Router();
router.use(protect);
router.get(
  '/',
  validate(z.object({ query: searchQuerySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ success: true, data: await search(req.user!, String(req.query.q)) });
    } catch (error) {
      next(error);
    }
  },
);
export default router;
