import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { catalogPathIdSchema, createSeriesSchema, seriesVersionSchema, updateSeriesSchema } from '@study-tracker/contracts';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSeries, listSeries, seriesDTO, stopSeries, updateSeries } from '../services/sessionSeries';
import { sessionTimezone } from '../services/studyTracking';

const router = Router();
const params = z.object({ id: catalogPathIdSchema });
// A routine lives in its owner's current time zone.
const ownerTimezone = (req: Request) => sessionTimezone(req.user!, {});

router.use(protect);
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { series: (await listSeries(req.user!)).map(seriesDTO) } });
  } catch (error) { next(error); }
});
router.post('/', validate(z.object({ body: createSeriesSchema })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { series, skippedDates } = await createSeries(req.user!, req.body, ownerTimezone(req));
    res.status(201).json({ success: true, data: { series: seriesDTO(series), skippedDates } });
  } catch (error) { next(error); }
});
router.put('/:id', validate(z.object({ params, body: updateSeriesSchema })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { series, skippedDates } = await updateSeries(req.user!, Number(req.params.id), req.body, ownerTimezone(req));
    res.json({ success: true, data: { series: seriesDTO(series), skippedDates } });
  } catch (error) { next(error); }
});
router.delete('/:id', validate(z.object({ params, body: seriesVersionSchema })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await stopSeries(req.user!, Number(req.params.id), req.body.expectedUpdatedAt);
    res.json({ success: true });
  } catch (error) { next(error); }
});
export default router;
