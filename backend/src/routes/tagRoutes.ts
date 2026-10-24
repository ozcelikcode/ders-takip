import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, setTagsSchema, tagInputSchema } from '@study-tracker/contracts';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTag, deleteTag, listTags, renameTag, setCourseTags, setSessionTags, tagDTO } from '../services/tags';

const router = Router();
const handle = (work: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response, next: NextFunction) => {
  try { await work(req, res); } catch (error) { next(error); }
};

router.use(protect);
router.get('/', handle(async (req, res) => { res.json({ success: true, data: await listTags(req.user!) }); }));
router.post('/', validate(z.object({ body: tagInputSchema })), handle(async (req, res) => {
  res.status(201).json({ success: true, data: { tag: tagDTO(await createTag(req.user!, req.body.name)) } });
}));
router.put('/courses/:courseId', validate(z.object({ params: z.object({ courseId: catalogPathIdSchema }), body: setTagsSchema })), handle(async (req, res) => {
  await setCourseTags(req.user!, Number(req.params.courseId), req.body.tagIds);
  res.json({ success: true });
}));
router.put('/sessions/:sessionId', validate(z.object({ params: z.object({ sessionId: catalogPathIdSchema }), body: setTagsSchema })), handle(async (req, res) => {
  await setSessionTags(req.user!, Number(req.params.sessionId), req.body.tagIds);
  res.json({ success: true });
}));
router.put('/:id', validate(z.object({ params: z.object({ id: catalogPathIdSchema }), body: tagInputSchema })), handle(async (req, res) => {
  res.json({ success: true, data: { tag: tagDTO(await renameTag(req.user!, Number(req.params.id), req.body.name)) } });
}));
router.delete('/:id', validate(z.object({ params: z.object({ id: catalogPathIdSchema }) })), handle(async (req, res) => {
  await deleteTag(req.user!, Number(req.params.id));
  res.json({ success: true });
}));
export default router;
