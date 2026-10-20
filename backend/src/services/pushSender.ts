import { isKnownPushService, type PushPayload } from '@study-tracker/contracts';
import webpush, { WebPushError } from 'web-push';
import { getEnvironment } from '../config/environment';

export interface StoredSubscription { endpoint: string; p256dh: string; auth: string }

/** Web Push delivery; disabled without VAPID keys. Exposed as an object so tests can replace `send`. */
export const pushSender = {
  publicKey(): string | null {
    return getEnvironment().VAPID_PUBLIC_KEY ?? null;
  },
  enabled(): boolean {
    return !!this.publicKey();
  },
  /** Resolves true when delivered, false when the browser unsubscribed (the caller removes it); throws otherwise. */
  async send(subscription: StoredSubscription, payload: PushPayload): Promise<boolean> {
    const environment = getEnvironment();
    if (!environment.VAPID_PUBLIC_KEY || !environment.VAPID_PRIVATE_KEY || !environment.VAPID_SUBJECT) throw new Error('Push delivery is not configured');
    // Checked again at send time so no stored row can make the server call an arbitrary host.
    if (!isKnownPushService(subscription.endpoint)) throw new Error('Push endpoint is not a known push service');
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
        { vapidDetails: { subject: environment.VAPID_SUBJECT, publicKey: environment.VAPID_PUBLIC_KEY, privateKey: environment.VAPID_PRIVATE_KEY }, TTL: 60 * 60, urgency: 'normal' },
      );
      return true;
    } catch (error) {
      // 404/410: the push service no longer knows this subscription.
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return false;
      throw error;
    }
  },
};
