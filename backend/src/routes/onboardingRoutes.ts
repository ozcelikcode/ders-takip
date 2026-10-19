import { completeOnboardingSchema } from '@study-tracker/contracts';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { completeOnboarding } from '../services/onboarding';
import { userResponse } from '../services/userResponses';

const router = Router();
router.use(protect);
router.post(
  '/',
  validate(z.object({ body: completeOnboardingSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await completeOnboarding(req.user!.id, req.body);
      res.json({ success: true, data: { user: userResponse(user) } });
    } catch (error) {
      next(error);
    }
  },
);
export default router;
