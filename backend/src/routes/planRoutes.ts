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

const router = Router();

// Validation schemas
const createPlanSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }),
    goals: z.object({
      dailyHours: z.number().min(0).max(24),
      weeklyHours: z.number().min(0).max(168),
      targetTopics: z.number().min(0),
      priority: z.enum(['low', 'medium', 'high']),
    }).optional(),
  }),
});

const updatePlanSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }).optional(),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }).optional(),
    goals: z.object({
      dailyHours: z.number().min(0).max(24).optional(),
      weeklyHours: z.number().min(0).max(168).optional(),
      targetTopics: z.number().min(0).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
    }).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Apply authentication middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .get(getPlans)
  .post(validate(createPlanSchema), createPlan);

router.route('/:id')
  .get(getPlan)
  .put(validate(updatePlanSchema), updatePlan)
  .delete(deletePlan);

router.route('/:id/stats')
  .get(getPlanStats);

export default router;