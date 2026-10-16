import express from 'express';
import {
createUser,
deleteUser,
getAdminOverview,
getUser,
getUserStudyStats,
getUsers,
updateUser,
} from '../controllers/userController';
import { authorize, protect } from '../middleware/auth';
import { registerSchema, validateRequest } from '../utils/validation';

const router = express.Router();

router.use(protect);

router.get('/', authorize('admin'), getUsers);

router.get('/admin-stats', authorize('admin'), getAdminOverview);
router.get('/:id/stats', getUserStudyStats);
router.get('/:id', getUser);

router.post('/', authorize('admin'), validateRequest(registerSchema), createUser);

router.put('/:id', authorize('admin'), updateUser);

router.delete('/:id', authorize('admin'), deleteUser);

export default router;