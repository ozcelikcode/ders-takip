const { it } = require('node:test');
const assert = require('node:assert/strict');
const { isKnownPushService, defaultPreferences, preferencesPatchSchema, preferencesSchema, pushSubscriptionSchema, resolveNotifications, defaultNotificationPreferences, formatGoalMinutes, formatMeasuredSeconds } = require('../dist/cjs');

it('notifications are opt-in: stored accounts without the field have everything off', () => {
  assert.deepEqual(resolveNotifications(preferencesSchema.parse(defaultPreferences)), defaultNotificationPreferences);
  assert.equal(Object.values(defaultNotificationPreferences).filter((value) => value === true).length, 0);
  // The retired flags are dropped when read, not kept.
  assert.equal('emailNotifications' in preferencesSchema.parse({ ...defaultPreferences, emailNotifications: true }), false);
});

it('accepts only whole, known notification choices', () => {
  const valid = { ...defaultNotificationPreferences, sessionReminderPush: true, reminderLeadMinutes: 15 };
  assert.equal(preferencesPatchSchema.safeParse({ notifications: valid }).success, true);
  assert.equal(preferencesPatchSchema.safeParse({ notifications: { ...valid, reminderLeadMinutes: 7 } }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ notifications: { sessionReminderPush: true } }).success, false);
  assert.equal(preferencesPatchSchema.safeParse({ notifications: { ...valid, sms: true } }).success, false);
});

it('push subscriptions must point at an https push service', () => {
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/a', expirationTime: null, keys: { p256dh: 'p', auth: 'a' } };
  assert.equal(pushSubscriptionSchema.safeParse(subscription).success, true);
  assert.equal(pushSubscriptionSchema.safeParse({ ...subscription, endpoint: 'http://push.example.com/a' }).success, false);
  assert.equal(pushSubscriptionSchema.safeParse({ ...subscription, keys: { p256dh: 'p' } }).success, false);
});

it('formats durations the same way for screens and emails', () => {
  assert.deepEqual([0, 45, 60, 90].map((minutes) => formatGoalMinutes(minutes)), ['Hedef yok', '45 dk', '1 sa', '1 sa 30 dk']);
  assert.deepEqual([0, 45, 60, 90].map((minutes) => formatGoalMinutes(minutes, 'en')), ['No goal', '45 min', '1 h', '1 h 30 min']);
  assert.deepEqual([40, 300, 7500].map((seconds) => formatMeasuredSeconds(seconds)), ['40 sn', '5 dk 0 sn', '2 sa 5 dk']);
  assert.deepEqual([40, 300, 7500].map((seconds) => formatMeasuredSeconds(seconds, 'en')), ['40 s', '5 min 0 s', '2 h 5 min']);
});

it('accepts only known browser push services as endpoints', () => {
  for (const endpoint of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/Q', 'https://db5p.notify.windows.com/w/?token=x']) {
    assert.equal(isKnownPushService(endpoint), true, endpoint);
  }
  for (const endpoint of [
    'https://localhost/fcm', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://fcm.googleapis.com:8443/x',
    'https://fcm.googleapis.com.attacker.example/x', 'https://evilnotify.windows.com/x', 'https://user:pass@fcm.googleapis.com/x',
    'http://fcm.googleapis.com/x', 'not a url',
  ]) {
    assert.equal(isKnownPushService(endpoint), false, endpoint);
  }
});
