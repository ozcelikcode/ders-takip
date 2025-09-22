import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { registerSchema } from '../utils/validation';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getUsers);

router.get('/:id', getUser);

router.post('/', authorize('admin'), validateRequest(registerSchema), createUser);

router.put('/:id', authorize('admin'), updateUser);

router.delete('/:id', authorize('admin'), deleteUser);

export default router;