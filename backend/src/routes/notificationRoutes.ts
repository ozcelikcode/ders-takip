import { markNotificationsReadSchema, pushSubscriptionSchema, removePushSubscriptionSchema, testNotificationSchema } from '@study-tracker/contracts';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { markNotificationsRead, readChannels, removePushSubscription, savePushSubscription, sendTestNotification } from '../services/notifications';

const router = Router();
router.use(protect);
const handle = (action: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};

router.get('/channels', handle(() => readChannels()));
router.post('/push-subscriptions', validate(z.object({ body: pushSubscriptionSchema })), handle(async (req) => { await savePushSubscription(req.user!.id, req.body); return null; }));
router.delete('/push-subscriptions', validate(z.object({ body: removePushSubscriptionSchema })), handle(async (req) => { await removePushSubscription(req.user!.id, req.body.endpoint); return null; }));
router.post('/test', validate(z.object({ body: testNotificationSchema })), handle((req) => sendTestNotification(req.user!.id, req.body.channel)));
router.post('/read', validate(z.object({ body: markNotificationsReadSchema })), handle(async (req) => ({ marked: await markNotificationsRead(req.user!.id, req.body.sessionIds) })));
export default router;
