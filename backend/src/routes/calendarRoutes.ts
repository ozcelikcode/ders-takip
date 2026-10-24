import { Router, type NextFunction, type Request, type Response } from 'express';
import { protect } from '../middleware/auth';
import { calendarFeedStatus, createCalendarFeed, deleteCalendarFeed, renderCalendarFeed } from '../services/calendarFeeds';
import { sendMaintenance } from '../services/siteSettings';

/** Calendar apps fetch the feed without signing in; the long key in the address is the only credential. */
export const calendarFeedRouter = Router();
calendarFeedRouter.get('/:token.ics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await renderCalendarFeed(req.params.token ?? '');
    if (feed === 'maintenance') { sendMaintenance(res); return; }
    if (feed === null) { res.status(404).json({ success: false, error: { code: 'recordNotFound' } }); return; }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(feed);
  } catch (error) { next(error); }
});

/** The signed-in person's subscription: its state, a new address (shown once) or switching it off. */
export const calendarSettingsRouter = Router();
calendarSettingsRouter.use(protect);
calendarSettingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await calendarFeedStatus(req.user!.id) }); } catch (error) { next(error); }
});
calendarSettingsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await createCalendarFeed(req.user!.id) }); } catch (error) { next(error); }
});
calendarSettingsRouter.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try { await deleteCalendarFeed(req.user!.id); res.json({ success: true }); } catch (error) { next(error); }
});
