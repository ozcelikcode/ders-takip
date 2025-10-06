import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics,
} from '../controllers/topicController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', getTopics);
router.get('/:id', getTopic);

// Admin-only routes
router.post('/', authorize('admin'), createTopic);
router.put('/:id', authorize('admin'), updateTopic);
router.delete('/:id', authorize('admin'), deleteTopic);
router.put('/course/:courseId/reorder', authorize('admin'), reorderTopics);

export default router;