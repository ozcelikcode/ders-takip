import { Router } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, createSessionSchema, updateSessionSchema, sessionVersionSchema, completeSessionSchema, startSessionSchema, sessionQuerySchema, pomodoroCommandSchema } from '@study-tracker/contracts';
import {
completeStudySession,
createStudySession,
deleteStudySession,
getStudySession,
getStudySessions,
getSessionStats,
controlPomodoro,
pauseStudySession,
startStudySession,
updateStudySession,
} from '../controllers/studySessionController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const params = z.object({ id: catalogPathIdSchema });
const sessionParamsSchema = z.object({ params });
const versionedSessionSchema = z.object({ params, body: sessionVersionSchema });
const createStudySessionSchema = z.object({ body: createSessionSchema });
const updateStudySessionSchema = z.object({ params, body: updateSessionSchema });
const completeStudySessionSchema = z.object({ params, body: completeSessionSchema });

// Apply authentication middleware to all routes
router.use(protect);

// Routes
router.get('/stats', validate(z.object({ query: sessionQuerySchema })), getSessionStats);

router.route('/')
  .get(validate(z.object({ query: sessionQuerySchema })), getStudySessions)
  .post(validate(createStudySessionSchema), createStudySession);

router.route('/:id')
  .get(validate(sessionParamsSchema), getStudySession)
  .put(validate(updateStudySessionSchema), updateStudySession)
  .delete(validate(versionedSessionSchema), deleteStudySession);

router.route('/:id/start')
  .patch(validate(z.object({ params, body: startSessionSchema })), startStudySession);

router.route('/:id/pause')
  .patch(validate(versionedSessionSchema), pauseStudySession);

router.route('/:id/complete')
  .patch(validate(completeStudySessionSchema), completeStudySession);

router.post('/:id/pomodoro', validate(z.object({ params, body: pomodoroCommandSchema })), controlPomodoro);

export default router;
