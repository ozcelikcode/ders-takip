import { Router } from 'express';
import { z } from 'zod';
import { createSessionSchema, updateSessionSchema, sessionVersionSchema, completeSessionSchema } from '@study-tracker/contracts';
import {
completeStudySession,
createStudySession,
deleteStudySession,
getStudySession,
getStudySessions,
pauseStudySession,
startStudySession,
updateStudySession,
} from '../controllers/studySessionController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const params = z.object({ id: z.string().regex(/^[1-9]\d*$/).refine(value => Number.isSafeInteger(Number(value))) });
const sessionParamsSchema = z.object({ params });
const versionedSessionSchema = z.object({ params, body: sessionVersionSchema });
const createStudySessionSchema = z.object({ body: createSessionSchema });
const updateStudySessionSchema = z.object({ params, body: updateSessionSchema });
const completeStudySessionSchema = z.object({ params, body: completeSessionSchema });

// Apply authentication middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .get(getStudySessions)
  .post(validate(createStudySessionSchema), createStudySession);

router.route('/:id')
  .get(validate(sessionParamsSchema), getStudySession)
  .put(validate(updateStudySessionSchema), updateStudySession)
  .delete(validate(versionedSessionSchema), deleteStudySession);

router.route('/:id/start')
  .patch(validate(versionedSessionSchema), startStudySession);

router.route('/:id/pause')
  .patch(validate(versionedSessionSchema), pauseStudySession);

router.route('/:id/complete')
  .patch(validate(completeStudySessionSchema), completeStudySession);

export default router;