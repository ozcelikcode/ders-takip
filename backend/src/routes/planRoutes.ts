import { Router } from 'express';
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanStats,
} from '../controllers/planController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import {
  createPlanSchema,
  updatePlanSchema,
  planQuerySchema,
  catalogPathIdSchema,
} from '@study-tracker/contracts';

const router = Router();

const params = z.object({ id: catalogPathIdSchema });

// Apply authentication middleware to all routes
router.use(protect);

// Routes
router
  .route('/')
  .get(validate(z.object({ query: planQuerySchema })), getPlans)
  .post(validate(z.object({ body: createPlanSchema })), createPlan);

router
  .route('/:id')
  .get(
    validate(
      z.object({
        params,
        query: planQuerySchema.pick({ includeSessions: true }),
      }),
    ),
    getPlan,
  )
  .put(validate(z.object({ params, body: updatePlanSchema })), updatePlan)
  .delete(validate(z.object({ params })), deletePlan);

router.route('/:id/stats').get(validate(z.object({ params })), getPlanStats);

export default router;
