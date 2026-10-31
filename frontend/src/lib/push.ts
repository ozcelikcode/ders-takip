/** Browser side of Web Push. The server keeps one subscription per browser endpoint. */
const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export type BrowserPushState = 'unsupported' | 'denied' | 'subscribed' | 'off';

const serviceWorker = () => navigator.serviceWorker.getRegistration('/');

/** The VAPID public key arrives as URL-safe base64; the Push API wants raw bytes. */
const keyBytes = (base64: string) => {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

export async function browserPushState(): Promise<BrowserPushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await serviceWorker();
  return (await registration?.pushManager.getSubscription()) ? 'subscribed' : 'off';
}

export class PushPermissionError extends Error {}

/** Asks for permission (only from a click) and subscribes this browser; returns what the server stores. */
export async function subscribeBrowser(publicKey: string): Promise<PushSubscriptionJSON> {
  if (!pushSupported()) throw new PushPermissionError('unsupported');
  if ((await Notification.requestPermission()) !== 'granted') throw new PushPermissionError('denied');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing.toJSON();
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  return subscription.toJSON();
}

/**
 * Stops push on this browser and returns the endpoint it had. Needs no session: after a sign-out the push service
 * answers "gone" to the next send and the server forgets the subscription itself.
 */
export async function unsubscribeBrowser(): Promise<string | null> {
  if (!pushSupported()) return null;
  const subscription = await (await serviceWorker())?.pushManager.getSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}
