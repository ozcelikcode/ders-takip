import { z } from 'zod';

export const reminderLeadOptions = [5, 10, 15, 30] as const;
export const reminderLeadSchema = z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]);

/** What a user opted into. Everything is off until they turn it on; nothing is sent by default. */
export const notificationPreferencesSchema = z.object({
  sessionReminderEmail: z.boolean(),
  sessionReminderPush: z.boolean(),
  /** Minutes before a planned session starts. */
  reminderLeadMinutes: reminderLeadSchema,
  dailyPlanEmail: z.boolean(),
  weeklySummaryEmail: z.boolean(),
}).strict();
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const defaultNotificationPreferences: NotificationPreferences = {
  sessionReminderEmail: false,
  sessionReminderPush: false,
  reminderLeadMinutes: 10,
  dailyPlanEmail: false,
  weeklySummaryEmail: false,
};

/** Local wall-clock times for the scheduled emails (24h, in the user's own time zone). */
export const dailyPlanHour = 7;
export const weeklySummaryHour = 19;

/**
 * Delivery channels on this server. `configured`: the operator set up SMTP / VAPID keys.
 * `enabled`: configured and allowed by the admin's site switch; only enabled channels are offered to users.
 */
export const notificationChannelsSchema = z.object({
  email: z.object({ configured: z.boolean(), enabled: z.boolean() }),
  push: z.object({ configured: z.boolean(), enabled: z.boolean(), publicKey: z.string().nullable() }),
});
export type NotificationChannels = z.infer<typeof notificationChannelsSchema>;

/**
 * Push services of the major browsers. The server sends to the subscription endpoint, so any other host would let
 * a user point the server at arbitrary URLs (SSRF); only these hosts, on the default port, are accepted.
 */
const pushServiceHosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
const pushServiceSuffixes = ['.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com'];
export const isKnownPushService = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return url.protocol === 'https:' && url.port === '' && !url.username && !url.password
      && (pushServiceHosts.includes(host) || pushServiceSuffixes.some((suffix) => host.endsWith(suffix)));
  } catch {
    return false;
  }
};

/** A browser's Push API subscription, as `PushSubscription.toJSON()` returns it. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000).refine(isKnownPushService, 'Tanınmayan bildirim servisi'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }).strict(),
}).strict();
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export const removePushSubscriptionSchema = z.object({ endpoint: z.string().min(1).max(1000) }).strict();

export const testNotificationSchema = z.object({ channel: z.enum(['email', 'push']) }).strict();
export type TestNotificationInput = z.infer<typeof testNotificationSchema>;

/** The payload the service worker shows. */
export interface PushPayload {
  title: string;
  body: string;
  /** App path to open on click, such as `/planner?date=2026-10-21`. */
  url: string;
  tag: string;
}
