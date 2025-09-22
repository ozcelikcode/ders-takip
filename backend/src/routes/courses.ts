import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseTopics,
} from '../controllers/courseController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getCourses);

router.get('/:id', getCourse);

router.post('/', authorize('admin'), createCourse);

router.put('/:id', authorize('admin'), updateCourse);

router.delete('/:id', authorize('admin'), deleteCourse);

router.get('/:id/topics', getCourseTopics);

export default router;