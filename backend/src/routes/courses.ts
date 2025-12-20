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

router.post('/', createCourse);

router.put('/:id', updateCourse);

router.delete('/:id', deleteCourse);

router.get('/:id/topics', getCourseTopics);

export default router;