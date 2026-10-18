import { Router } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, createCategorySchema, updateCategorySchema, deleteCategorySchema } from '@study-tracker/contracts';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const params = z.object({ id: catalogPathIdSchema });
router.use(protect);
router.get('/', getCategories);
router.use(authorize('admin'));
router.post('/', validate(z.object({ body: createCategorySchema })), createCategory);
router.put('/:id', validate(z.object({ params, body: updateCategorySchema })), updateCategory);
router.delete('/:id', validate(z.object({ params, body: deleteCategorySchema.default({}) })), deleteCategory);
export default router;
