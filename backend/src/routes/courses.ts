import { Router } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, createCourseSchema, updateCourseSchema } from '@study-tracker/contracts';
import { createCourse, deleteCourse, getCourse, getCourses, getCourseTopics, updateCourse } from '../controllers/courseController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const params = z.object({ id: catalogPathIdSchema });
router.use(protect);
const listQuery = z.object({
  categoryId: catalogPathIdSchema.optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  includeTopics: z.enum(['true', 'false']).optional(),
}).strict();
router.get('/', validate(z.object({ query: listQuery })), getCourses);
router.get('/:id', validate(z.object({ params, query: z.object({ includeTopics: z.enum(['true', 'false']).optional() }).strict() })), getCourse);
router.post('/', validate(z.object({ body: createCourseSchema })), createCourse);
router.put('/:id', validate(z.object({ params, body: updateCourseSchema })), updateCourse);
router.delete('/:id', validate(z.object({ params })), deleteCourse);
router.get('/:id/topics', validate(z.object({ params, query: z.object({ isActive: z.enum(['true', 'false']).optional() }).strict() })), getCourseTopics);
export default router;
