import { Router } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, setTopicProgressSchema, createTopicSchema, updateTopicSchema, reorderTopicsSchema } from '@study-tracker/contracts';
import { createTopic, deleteTopic, getTopic, getTopicProgress, getTopics, updateTopicProgress, reorderTopics, updateTopic } from '../controllers/topicController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const params = z.object({ id: catalogPathIdSchema });
router.use(protect);
router.get('/', getTopics);
router.get('/progress', getTopicProgress);
router.put('/:id/progress', validate(z.object({ params, body: setTopicProgressSchema })), updateTopicProgress);
router.get('/:id', validate(z.object({ params })), getTopic);
router.post('/', validate(z.object({ body: createTopicSchema })), createTopic);
router.put('/:id', validate(z.object({ params, body: updateTopicSchema })), updateTopic);
router.delete('/:id', validate(z.object({ params })), deleteTopic);
router.put('/course/:courseId/reorder', validate(z.object({ params: z.object({ courseId: catalogPathIdSchema }), body: reorderTopicsSchema })), reorderTopics);
export default router;
