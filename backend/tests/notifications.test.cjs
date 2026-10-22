const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-notifications-'));
Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'),
  BACKUP_DIR: path.join(directory, 'backups'), FRONTEND_URL: 'http://app.test',
  VAPID_PUBLIC_KEY: 'test-public-key', VAPID_PRIVATE_KEY: 'test-private-key', VAPID_SUBJECT: 'mailto:ops@example.com',
});
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { NotificationDelivery, PushSubscription, Settings, StudySession, User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');
const { mailer } = require('../dist/services/mailer');
const { pushSender } = require('../dist/services/pushSender');
const { runDueNotifications } = require('../dist/services/notifications');
const { defaultPreferences, defaultNotificationPreferences } = require('@study-tracker/contracts');

let ada, ben;
const minute = 60_000;
const call = async (method, url, user, body) => {
  user.sessionId ??= (await createAuthSession(user)).session.id;
  const operation = request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(generateAccessToken({ id: String(user.id), sid: user.sessionId }), { type: 'bearer' });
  return body === undefined ? operation : operation.send(body);
};
const subscription = (name) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${name}`, keys: { p256dh: `key-${name}`, auth: `auth-${name}` } });
const setNotifications = async (user, notifications, extra = {}) => {
  user.preferences = { ...user.preferences, ...extra, notifications: { ...defaultNotificationPreferences, ...notifications } };
  await user.save();
};
const capture = (t) => {
  const mails = [];
  const pushes = [];
  t.mock.method(mailer, 'enabled', () => true);
  t.mock.method(mailer, 'send', async (message) => { mails.push(message); });
  t.mock.method(pushSender, 'send', async (target, payload) => { pushes.push({ endpoint: target.endpoint, ...payload }); return true; });
  return { mails, pushes };
};
const session = (user, start, extra = {}) => StudySession.create({ userId: user.id, title: 'Okuma', startTime: start, endTime: new Date(start.getTime() + 60 * minute), duration: 60, ...extra });

before(async () => {
  await applyMigrations();
  const create = (name, preferences) => User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: name, lastName: 'Test', preferences: { ...defaultPreferences, ...preferences } });
  ada = await create('ada', { timezone: 'Asia/Tokyo', activeStudyDays: [1, 2, 3, 4, 5], dailyStudyGoal: 1.5 });
  ben = await create('ben', { timezone: 'UTC' });
});
beforeEach(async () => {
  await NotificationDelivery.destroy({ where: {} });
  await PushSubscription.destroy({ where: {} });
  await StudySession.destroy({ where: {} });
  await Settings.destroy({ where: {} });
  for (const user of [ada, ben]) await setNotifications(user, {});
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('migration 009 drops the retired notification flags and keeps everything else', async () => {
  await sequelize.query("UPDATE users SET preferences = json_set(preferences, '$.emailNotifications', json('true'), '$.taskReminders', json('false'), '$.legacyPreferences', json('{\"theme\":\"dark\"}')) WHERE id = :id", { replacements: { id: ben.id } });
  await sequelize.query("DELETE FROM schema_migrations WHERE name = '009-notifications'");
  await applyMigrations();
  const [row] = await sequelize.query('SELECT preferences FROM users WHERE id = :id', { replacements: { id: ben.id }, type: sequelize.QueryTypes.SELECT });
  const stored = JSON.parse(row.preferences);
  assert.equal('emailNotifications' in stored, false);
  assert.equal('taskReminders' in stored, false);
  assert.deepEqual(stored.legacyPreferences, { theme: 'dark' });
  assert.equal(stored.timezone, 'UTC');
  await ben.reload();
});

it('offers only channels that are configured and allowed by the admin switch', async (t) => {
  t.mock.method(mailer, 'enabled', () => false);
  const off = (await call('get', '/api/notifications/channels', ada)).body.data;
  assert.deepEqual(off, { email: { configured: false, enabled: false }, push: { configured: true, enabled: true, publicKey: 'test-public-key' } });
  await Settings.create({ key: 'pushNotifications', value: 'false', type: 'boolean', category: 'notifications' });
  const blocked = (await call('get', '/api/notifications/channels', ada)).body.data;
  assert.deepEqual(blocked.push, { configured: true, enabled: false, publicKey: null });
  assert.equal((await call('post', '/api/notifications/push-subscriptions', ada, subscription('blocked'))).status, 400);
});

it('stores a browser subscription per account and lets only its owner remove it', async () => {
  assert.equal((await call('post', '/api/notifications/push-subscriptions', ada, subscription('laptop'))).status, 200);
  assert.equal((await call('post', '/api/notifications/push-subscriptions', ada, { ...subscription('x'), endpoint: 'http://push.example.com/x' })).status, 400);
  // The server sends to this URL, so only real push services are accepted (no internal hosts).
  for (const endpoint of ['https://internal.example.com/hook', 'https://169.254.169.254/latest', 'https://fcm.googleapis.com.evil.example/x']) {
    assert.equal((await call('post', '/api/notifications/push-subscriptions', ada, { ...subscription('x'), endpoint })).status, 400, endpoint);
  }
  // The same browser signing in as another account moves the subscription.
  assert.equal((await call('post', '/api/notifications/push-subscriptions', ben, subscription('laptop'))).status, 200);
  assert.equal((await PushSubscription.findOne({ where: { endpoint: subscription('laptop').endpoint } })).userId, ben.id);
  assert.equal((await call('delete', '/api/notifications/push-subscriptions', ada, { endpoint: subscription('laptop').endpoint })).status, 200);
  assert.equal(await PushSubscription.count(), 1);
  assert.equal((await call('delete', '/api/notifications/push-subscriptions', ben, { endpoint: subscription('laptop').endpoint })).status, 200);
  assert.equal(await PushSubscription.count(), 0);
});

it('reminds once before a planned session, by every chosen channel, and again after it moves', async (t) => {
  const { mails, pushes } = capture(t);
  await setNotifications(ben, { sessionReminderEmail: true, sessionReminderPush: true, reminderLeadMinutes: 10 });
  await PushSubscription.create({ userId: ben.id, endpoint: 'https://fcm.googleapis.com/fcm/send/ben', p256dh: 'k', auth: 'a' });
  const now = new Date('2026-10-21T08:00:00Z');
  const soon = await session(ben, new Date(now.getTime() + 9 * minute));
  await session(ben, new Date(now.getTime() + 20 * minute), { title: 'Sonra' });
  await session(ben, new Date(now.getTime() + 5 * minute), { title: 'İptal', status: 'cancelled' });
  await runDueNotifications(now);
  await runDueNotifications(new Date(now.getTime() + 30_000));
  assert.deepEqual(mails.map((mail) => [mail.to, mail.subject]), [['ben@example.com', '“Okuma” 9 dk sonra başlıyor · Görev Takip Sistemi']]);
  assert.match(mails[0].text, /08:09–09:09 · Okuma/);
  assert.match(mails[0].text, /http:\/\/app\.test\/planner\?date=2026-10-21/);
  assert.deepEqual(pushes.map((push) => [push.title, push.url, push.tag]), [['“Okuma” 9 dk sonra başlıyor', '/planner?date=2026-10-21', `session-${soon.id}`]]);
  await runDueNotifications(new Date(now.getTime() + 11 * minute));
  await soon.update({ startTime: new Date(now.getTime() + 40 * minute), endTime: new Date(now.getTime() + 100 * minute) });
  await runDueNotifications(new Date(now.getTime() + 31 * minute));
  assert.deepEqual(mails.slice(1).map((mail) => mail.subject.split(' ·')[0]), ['“Sonra” 9 dk sonra başlıyor', '“Okuma” 9 dk sonra başlıyor']);
});

it('never sends to a stored endpoint outside the known push services', async () => {
  const { pushSender: sender } = require('../dist/services/pushSender');
  await assert.rejects(sender.send({ endpoint: 'https://internal.example.com/hook', p256dh: 'k', auth: 'a' }, { title: 't', body: 'b', url: '/', tag: 't' }), /not a known push service/);
});

it('forgets browsers the push service no longer knows and keeps silent for opted-out users', async (t) => {
  const { mails } = capture(t);
  t.mock.method(pushSender, 'send', async () => false);
  await setNotifications(ben, { sessionReminderPush: true, reminderLeadMinutes: 5 });
  await PushSubscription.create({ userId: ben.id, endpoint: 'https://fcm.googleapis.com/fcm/send/gone', p256dh: 'k', auth: 'a' });
  const now = new Date('2026-10-21T08:00:00Z');
  await session(ben, new Date(now.getTime() + 4 * minute));
  await session(ada, new Date(now.getTime() + 4 * minute));
  await runDueNotifications(now);
  assert.equal(await PushSubscription.count(), 0);
  assert.equal(mails.length, 0);
  assert.equal(await NotificationDelivery.count({ where: { userId: ada.id } }), 0);
});

it('sends the morning plan once on active days, in the user\'s own time zone', async (t) => {
  const { mails } = capture(t);
  await setNotifications(ada, { dailyPlanEmail: true });
  // Wednesday 2026-10-21 in Tokyo (UTC+9).
  await session(ada, new Date('2026-10-21T01:00:00Z'), { title: 'Japonca' });
  await session(ada, new Date('2026-10-22T01:00:00Z'), { title: 'Yarın' });
  await runDueNotifications(new Date('2026-10-20T21:59:00Z')); // 06:59 local
  assert.equal(mails.length, 0);
  await runDueNotifications(new Date('2026-10-20T22:30:00Z')); // 07:30 local
  await runDueNotifications(new Date('2026-10-20T23:30:00Z'));
  assert.equal(mails.length, 1);
  assert.equal(mails[0].subject, 'Bugünün planı: 1 seans · Görev Takip Sistemi');
  assert.match(mails[0].text, /Bugünkü hedefin: 1 sa 30 dk\./);
  assert.match(mails[0].text, /• 10:00–11:00 · Japonca/);
  assert.doesNotMatch(mails[0].text, /Yarın/);
  // Saturday is not an active day; a noon start is too late for a morning plan.
  await runDueNotifications(new Date('2026-10-23T22:30:00Z'));
  await runDueNotifications(new Date('2026-10-22T03:00:00Z'));
  assert.equal(mails.length, 1);
});

it('sends the weekly summary on the week\'s last evening with the derived weekly goal', async (t) => {
  const { mails } = capture(t);
  await setNotifications(ben, { weeklySummaryEmail: true }, { dailyStudyGoal: 1, activeStudyDays: [1, 2, 3], weekStartsOn: 1 });
  await runDueNotifications(new Date('2026-10-24T19:30:00Z')); // Saturday
  await runDueNotifications(new Date('2026-10-25T18:59:00Z')); // Sunday before 19:00
  assert.equal(mails.length, 0);
  await runDueNotifications(new Date('2026-10-25T19:01:00Z'));
  await runDueNotifications(new Date('2026-10-25T21:00:00Z'));
  assert.equal(mails.length, 1);
  assert.equal(mails[0].subject, 'Haftalık özet: 0 dk · Görev Takip Sistemi');
  assert.match(mails[0].text, /Ölçülen çalışma: 0 dk \/ hedef 3 sa \(%0\)\./);
});

it('writes emails and browser notifications in the recipient\'s own interface language', async (t) => {
  const { mails, pushes } = capture(t);
  await setNotifications(ada, { dailyPlanEmail: true, sessionReminderEmail: true, sessionReminderPush: true, reminderLeadMinutes: 10 }, { language: 'en', terminologyPreset: 'education' });
  await PushSubscription.create({ userId: ada.id, endpoint: 'https://fcm.googleapis.com/fcm/send/ada', p256dh: 'k', auth: 'a' });
  await session(ada, new Date('2026-10-21T01:00:00Z'), { title: 'Japanese' });
  await runDueNotifications(new Date('2026-10-20T22:30:00Z')); // 07:30 in Tokyo
  await runDueNotifications(new Date('2026-10-21T00:51:00Z')); // 9 minutes before the session
  assert.deepEqual(mails.map((mail) => mail.subject), ['Today\'s plan: 1 session · Görev Takip Sistemi', '“Japanese” starts in 9 min · Görev Takip Sistemi']);
  assert.match(mails[0].text, /Good morning ada,\nToday's goal: 1 h 30 min\.\n1 session planned for today:/);
  assert.match(mails[1].text, /Your session starts in 9 minutes:/);
  assert.match(mails[1].text, /notification settings; turn it off in Settings › Notifications\./);
  assert.deepEqual(pushes.map((push) => push.title), ['“Japanese” starts in 9 min']);
  await setNotifications(ada, {}, { language: 'tr', terminologyPreset: undefined });
});

it('respects the admin switch for scheduled delivery and the channel test', async (t) => {
  const { mails } = capture(t);
  await setNotifications(ben, { sessionReminderEmail: true });
  await Settings.create({ key: 'emailNotifications', value: 'false', type: 'boolean', category: 'notifications' });
  await Settings.create({ key: 'pushNotifications', value: 'false', type: 'boolean', category: 'notifications' });
  const now = new Date('2026-10-21T08:00:00Z');
  await session(ben, new Date(now.getTime() + 5 * minute));
  await runDueNotifications(now);
  assert.equal(mails.length, 0);
  assert.equal((await call('post', '/api/notifications/test', ben, { channel: 'email' })).status, 400);
  await Settings.destroy({ where: {} });
  assert.deepEqual((await call('post', '/api/notifications/test', ben, { channel: 'email' })).body.data, { delivered: 1 });
  assert.equal(mails.at(-1).to, 'ben@example.com');
  const noBrowser = await call('post', '/api/notifications/test', ben, { channel: 'push' });
  assert.deepEqual([noBrowser.status, noBrowser.body.error.code], [409, 'noPushSubscription']);
});
