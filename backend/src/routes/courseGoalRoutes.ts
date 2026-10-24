import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, setCourseGoalSchema } from '@study-tracker/contracts';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { clearCourseGoal, courseGoalDTO, listCourseGoals, setCourseGoal } from '../services/courseGoals';

const router = Router();
const params = z.object({ courseId: catalogPathIdSchema });

router.use(protect);
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { goals: (await listCourseGoals(req.user!)).map(courseGoalDTO) } });
  } catch (error) { next(error); }
});
router.put('/:courseId', validate(z.object({ params, body: setCourseGoalSchema })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goal = await setCourseGoal(req.user!, Number(req.params.courseId), req.body.weeklyMinutes);
    res.json({ success: true, data: { goal: courseGoalDTO(goal) } });
  } catch (error) { next(error); }
});
router.delete('/:courseId', validate(z.object({ params })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await clearCourseGoal(req.user!, Number(req.params.courseId));
    res.json({ success: true });
  } catch (error) { next(error); }
});
export default router;
