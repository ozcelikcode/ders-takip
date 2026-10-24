const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-calendar-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, StudySession, CalendarFeed } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const auth = (method, url, user) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const feedPath = (url) => new URL(url).pathname;
const soon = (hours) => new Date(Date.now() + hours * 3_600_000);
let owner, other;

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
  const category = await Category.create({ name: 'Fixture category', order: 1 });
  const course = await Course.create({ name: 'Müzik dersleri', order: 1, categoryId: category.id, isGlobal: true });
  const session = (userId, title, start, extra = {}) => StudySession.create({ userId, title, startTime: soon(start), endTime: soon(start + 1), duration: 60, ...extra });
  await session(owner.id, 'Gitar', 2, { courseId: course.id, notes: 'Private note', description: 'Private description' });
  await session(owner.id, 'Okuma, yazma; tekrar\\nsatır', 4);
  await session(owner.id, 'Uzun başlık '.repeat(12).trim(), 6);
  await session(owner.id, 'Cancelled plan', 8, { status: 'cancelled' });
  await session(owner.id, 'Long ago', -24 * 60);
  await session(other.id, 'Someone else', 3);
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('gives a calendar app a private address once and serves the sessions as iCalendar', async () => {
  assert.deepEqual((await auth('get', '/api/calendar-feed', owner).expect(200)).body.data, { active: false, createdAt: null });
  const created = (await auth('post', '/api/calendar-feed', owner).expect(201)).body.data;
  assert.match(created.url, /^https?:\/\/[^/]+\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/);
  const status = (await auth('get', '/api/calendar-feed', owner).expect(200)).body;
  assert.equal(status.data.active, true);
  assert.equal(JSON.stringify(status).includes(feedPath(created.url).slice(14, 57)), false);
  // Only a hash of the key is stored.
  assert.equal((await CalendarFeed.findByPk(owner.id)).tokenHash.length, 64);

  const response = await request(app).get(feedPath(created.url)).expect(200);
  assert.match(response.headers['content-type'], /^text\/calendar; charset=utf-8/);
  const text = response.text;
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  const unfolded = text.replace(/\r\n /g, '');
  assert.match(unfolded, /SUMMARY:Gitar · Müzik dersleri\r\n/);
  assert.match(unfolded, /SUMMARY:Okuma\\, yazma\\; tekrar\\\\nsatır\r\n/);
  assert.match(unfolded, /SUMMARY:(Uzun başlık ){11}Uzun başlık\r\n/);
  for (const hidden of ['Private note', 'Private description', 'Cancelled plan', 'Long ago', 'Someone else'])
    assert.equal(unfolded.includes(hidden), false, hidden);
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 3);
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
  assert.match(unfolded, /DTSTART:\d{8}T\d{6}Z\r\nDTEND:\d{8}T\d{6}Z/);
});

it('stops the old address when renewed or switched off, and for an inactive account', async () => {
  const first = (await auth('post', '/api/calendar-feed', owner).expect(201)).body.data.url;
  const second = (await auth('post', '/api/calendar-feed', owner).expect(201)).body.data.url;
  assert.notEqual(first, second);
  await request(app).get(feedPath(first)).expect(404);
  await request(app).get(feedPath(second)).expect(200);
  await request(app).get('/api/calendar/short.ics').expect(404);
  await request(app).get(`/api/calendar/${'A'.repeat(43)}.ics`).expect(404);

  await owner.update({ isActive: false });
  await request(app).get(feedPath(second)).expect(404);
  await owner.update({ isActive: true });
  await auth('delete', '/api/calendar-feed', owner).expect(200);
  await request(app).get(feedPath(second)).expect(404);
  assert.equal(await CalendarFeed.count({ where: { userId: owner.id } }), 0);
});
