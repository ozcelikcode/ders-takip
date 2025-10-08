import { Router } from 'express';
import {
  getStudySessions,
  getStudySession,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  startStudySession,
  pauseStudySession,
  completeStudySession,
} from '../controllers/studySessionController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createStudySessionSchema = z.object({
  body: z.object({
    planId: z.number().optional(),
    topicId: z.number().optional(),
    courseId: z.number().optional(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    startTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start time format',
    }),
    endTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end time format',
    }),
    sessionType: z.enum(['study', 'break', 'pomodoro', 'review']).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    pomodoroSettings: z.object({
      workDuration: z.number().min(1).max(120),
      shortBreak: z.number().min(1).max(30),
      longBreak: z.number().min(1).max(60),
      cyclesBeforeLongBreak: z.number().min(1).max(10),
      currentCycle: z.number().min(0),
    }).optional(),
  }),
});

const updateStudySessionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Session ID is required'),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    startTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start time format',
    }).optional(),
    endTime: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end time format',
    }).optional(),
    status: z.enum(['planned', 'in_progress', 'completed', 'cancelled', 'paused']).optional(),
    notes: z.string().optional(),
    productivity: z.number().min(1).max(5).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
    pomodoroSettings: z.object({
      workDuration: z.number().min(1).max(120).optional(),
      shortBreak: z.number().min(1).max(30).optional(),
      longBreak: z.number().min(1).max(60).optional(),
      cyclesBeforeLongBreak: z.number().min(1).max(10).optional(),
      currentCycle: z.number().min(0).optional(),
    }).optional(),
  }),
});

const sessionParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Session ID is required'),
  }),
});

const completeSessionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Session ID is required'),
  }),
  body: z.object({
    notes: z.string().optional(),
    productivity: z.number().min(1).max(5).optional(),
  }),
});

// Apply authentication middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .get(getStudySessions)
  .post(validate(createStudySessionSchema), createStudySession);

router.route('/:id')
  .get(validate(sessionParamsSchema), getStudySession)
  .put(validate(updateStudySessionSchema), updateStudySession)
  .delete(validate(sessionParamsSchema), deleteStudySession);

router.route('/:id/start')
  .patch(validate(sessionParamsSchema), startStudySession);

router.route('/:id/pause')
  .patch(validate(sessionParamsSchema), pauseStudySession);

router.route('/:id/complete')
  .patch(validate(completeSessionSchema), completeStudySession);

export default router;