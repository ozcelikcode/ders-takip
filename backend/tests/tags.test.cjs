const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-tags-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, StudySession, CourseTag, SessionTag } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const auth = (method, url, user) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const tag = async (user, name) => (await auth('post', '/api/tags', user).send({ name }).expect(201)).body.data.tag;
const tagsOf = async (user) => (await auth('get', '/api/tags', user).expect(200)).body.data;
let owner, other, shared, own, sessions;

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
  const category = await Category.create({ name: 'Fixture category', order: 1 });
  shared = await Course.create({ name: 'Shared course', order: 1, categoryId: category.id, isGlobal: true });
  own = await Course.create({ name: 'Own course', order: 2, categoryId: category.id, isGlobal: false, userId: owner.id });
  const session = (title, hour, courseId = null) => StudySession.create({ userId: owner.id, title, courseId, startTime: new Date(`2099-01-05T${hour}:00:00Z`), endTime: new Date(`2099-01-05T${hour}:30:00Z`), duration: 30 });
  sessions = { viaCourse: await session('Through record', '08', shared.id), direct: await session('Tagged itself', '10'), plain: await session('Untagged', '12', own.id) };
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('keeps a personal tag vocabulary with names unique regardless of case and Turkish letters', async () => {
  const exam = await tag(owner, '  Sınav   haftası ');
  assert.equal(exam.name, 'Sınav haftası');
  for (const name of ['SINAV HAFTASI', 'sinav haftasi']) await auth('post', '/api/tags', owner).send({ name }).expect(409);
  for (const name of ['', '   ', 'x'.repeat(41)]) await auth('post', '/api/tags', owner).send({ name }).expect(400);
  // Another person may use the same name.
  await tag(other, 'Sınav haftası');
  const reading = await tag(owner, 'Okuma');
  assert.equal((await auth('put', `/api/tags/${reading.id}`, owner).send({ name: 'Okuma listesi' }).expect(200)).body.data.tag.name, 'Okuma listesi');
  await auth('put', `/api/tags/${reading.id}`, owner).send({ name: 'sınav HAFTASI' }).expect(409);
  await auth('put', `/api/tags/${reading.id}`, other).send({ name: 'Mine now' }).expect(404);
  await auth('delete', `/api/tags/${reading.id}`, other).expect(404);
  assert.deepEqual((await tagsOf(owner)).tags.map((item) => item.name), ['Sınav haftası', 'Okuma listesi']);
  assert.deepEqual((await tagsOf(other)).tags.map((item) => item.name), ['Sınav haftası']);
});

it('tags records and sessions per person and filters sessions through either', async () => {
  const exam = await tag(owner, 'Exam');
  const theirs = await tag(other, 'Theirs');
  await auth('put', `/api/tags/courses/${shared.id}`, other).send({ tagIds: [theirs.id] }).expect(200);
  await auth('put', `/api/tags/courses/${shared.id}`, owner).send({ tagIds: [exam.id] }).expect(200);
  // Replacing my tags on a shared record leaves another person's tags alone.
  await auth('put', `/api/tags/courses/${shared.id}`, owner).send({ tagIds: [exam.id] }).expect(200);
  assert.equal(await CourseTag.count({ where: { courseId: shared.id } }), 2);
  await auth('put', `/api/tags/sessions/${sessions.direct.id}`, owner).send({ tagIds: [exam.id] }).expect(200);
  const mine = await tagsOf(owner);
  assert.deepEqual(mine.courseTags, [{ courseId: shared.id, tagId: exam.id }]);
  assert.deepEqual(mine.sessionTags, [{ sessionId: sessions.direct.id, tagId: exam.id }]);

  const listed = (await auth('get', `/api/study-sessions?tagId=${exam.id}`, owner).expect(200)).body.data.sessions.map((session) => session.title);
  assert.deepEqual(listed, ['Through record', 'Tagged itself']);
  const stats = (await auth('get', `/api/study-sessions/stats?tagId=${exam.id}`, owner).expect(200)).body.data.stats;
  assert.equal(stats.totalSessions, 2);
  await auth('get', `/api/study-sessions?tagId=${theirs.id}`, owner).expect(404);

  for (const [url, user, body, status] of [
    [`/api/tags/courses/${own.id}`, other, { tagIds: [theirs.id] }, 404],
    [`/api/tags/courses/${shared.id}`, owner, { tagIds: [theirs.id] }, 404],
    [`/api/tags/sessions/${sessions.plain.id}`, other, { tagIds: [theirs.id] }, 404],
    [`/api/tags/sessions/${sessions.plain.id}`, owner, { tagIds: [exam.id, exam.id] }, 400],
    [`/api/tags/sessions/${sessions.plain.id}`, owner, { tagIds: Array.from({ length: 21 }, (_, index) => index + 1) }, 400],
  ]) await auth('put', url, user).send(body).expect(status);

  const exported = (await auth('get', '/api/auth/account/export', owner).expect(200)).body;
  assert.ok(exported.tags.tags.some((item) => item.name === 'Exam'));
});

it('breaks measured study down by the person\'s own tags, through the session or its record', async () => {
  const { SessionInterval } = require('../dist/models');
  for (const [session, minutes] of [[sessions.viaCourse, 20], [sessions.direct, 10], [sessions.plain, 5]])
    await SessionInterval.create({ sessionId: session.id, kind: 'study', startedAt: session.startTime, endedAt: new Date(session.startTime.getTime() + minutes * 60000) });
  const exam = (await tagsOf(owner)).tags.find((item) => item.name === 'Exam');
  const stats = (await auth('get', '/api/study-sessions/stats?startDate=2099-01-05&endDate=2099-01-05&timezone=UTC', owner).expect(200)).body.data.stats;
  // Another person's tag on the shared record never shows up here; the untagged session is in no tag.
  assert.deepEqual(stats.tags, [{ tagId: exam.id, studySeconds: 30 * 60, sessions: 2 }]);
  assert.equal(stats.studySeconds, 35 * 60);
});

it('drops attachments with their tag, record or session', async () => {
  const temporary = await tag(owner, 'Temporary');
  await auth('put', `/api/tags/sessions/${sessions.plain.id}`, owner).send({ tagIds: [temporary.id] }).expect(200);
  await auth('put', `/api/tags/courses/${own.id}`, owner).send({ tagIds: [temporary.id] }).expect(200);
  await auth('delete', `/api/tags/${temporary.id}`, owner).expect(200);
  assert.equal(await SessionTag.count({ where: { tagId: temporary.id } }), 0);
  assert.equal(await CourseTag.count({ where: { tagId: temporary.id } }), 0);

  const kept = await tag(owner, 'Kept');
  await auth('put', `/api/tags/sessions/${sessions.plain.id}`, owner).send({ tagIds: [kept.id] }).expect(200);
  await auth('put', `/api/tags/courses/${own.id}`, owner).send({ tagIds: [kept.id] }).expect(200);
  await sessions.plain.destroy();
  await own.destroy();
  assert.equal(await SessionTag.count({ where: { tagId: kept.id } }), 0);
  assert.equal(await CourseTag.count({ where: { tagId: kept.id } }), 0);
});
