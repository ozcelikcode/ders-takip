const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-search-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, Topic, StudySession } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');

let owner, other;
const find = async (q, user = owner) =>
  (await request(app).get('/api/search').query({ q }).auth(generateAccessToken({ id: String(user.id), sid: user.sessionId }), { type: 'bearer' }).expect(200)).body.data;

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.sessionId = (await createAuthSession(user)).session.id;
    if (name === 'owner') owner = user; else other = user;
  }
  const category = await Category.create({ name: 'Yazılım', color: '#111111', icon: 'Code', order: 1 });
  const own = await Course.create({ name: 'Mobile Release', categoryId: category.id, userId: owner.id, color: '#111111', icon: 'Code', order: 1 });
  const shared = await Course.create({ name: 'Shared mobile guide', categoryId: category.id, isGlobal: true, color: '#111111', icon: 'Code', order: 2 });
  const foreign = await Course.create({ name: 'Mobile secret', categoryId: category.id, userId: other.id, color: '#111111', icon: 'Code', order: 3 });
  await Topic.create({ name: 'Mobile testing', courseId: own.id, estimatedTime: 30, difficulty: 'Orta', order: 1 });
  await Topic.create({ name: 'Mobile archive', courseId: own.id, estimatedTime: 30, difficulty: 'Orta', order: 2, isActive: false });
  await Topic.create({ name: 'Mobile foreign topic', courseId: foreign.id, estimatedTime: 30, difficulty: 'Orta', order: 1 });
  await Topic.create({ name: 'Mobile shared topic', courseId: shared.id, estimatedTime: 30, difficulty: 'Orta', order: 1 });
  const slot = (day) => ({ startTime: new Date(`2026-10-${day}T09:00:00Z`), endTime: new Date(`2026-10-${day}T10:00:00Z`), duration: 60 });
  await StudySession.create({ userId: owner.id, title: 'Weekly review', notes: 'mobile crash 100% fixed', ...slot(10) });
  await StudySession.create({ userId: owner.id, title: 'Mobile sprint', ...slot(11) });
  await StudySession.create({ userId: other.id, title: 'Mobile private session', ...slot(12) });
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('returns only visible courses and active topics under visible courses', async () => {
  const result = await find('MOBILE');
  assert.deepEqual(result.courses.map((course) => course.name).sort(), ['Mobile Release', 'Shared mobile guide']);
  assert.equal(result.courses[0].categoryName, 'Yazılım');
  assert.deepEqual(result.topics.map((topic) => topic.name).sort(), ['Mobile shared topic', 'Mobile testing']);
  assert.ok(result.topics.every((topic) => topic.courseName));
});

it('searches only the actor’s own sessions in title, description and notes and reports the match', async () => {
  const result = await find('mobile');
  assert.deepEqual(result.sessions.map((session) => [session.title, session.matchedIn]), [
    ['Mobile sprint', 'title'],
    ['Weekly review', 'notes'],
  ]);
  assert.deepEqual((await find('mobile', other)).sessions.map((session) => session.title), ['Mobile private session']);
});

it('treats wildcard characters literally and validates the query', async () => {
  assert.deepEqual((await find('100%')).sessions.map((session) => session.title), ['Weekly review']);
  assert.equal((await find('%_')).sessions.length, 0);
  const token = generateAccessToken({ id: String(owner.id), sid: owner.sessionId });
  await request(app).get('/api/search').query({ q: 'a' }).auth(token, { type: 'bearer' }).expect(400);
  await request(app).get('/api/search').query({ q: 'mobile', extra: '1' }).auth(token, { type: 'bearer' }).expect(400);
  await request(app).get('/api/search').query({ q: 'mobile' }).expect(401);
});

it('ignores case and Turkish letter forms in every searched field', async () => {
  const category = await Category.create({ name: 'Diller', color: '#111111', order: 2 });
  await Course.create({ name: 'İSTANBUL TARİHİ', categoryId: category.id, userId: owner.id, color: '#111111', order: 5 });
  await StudySession.create({ userId: owner.id, title: 'Sınav hazırlığı', description: 'Işık ve çağrı', startTime: new Date('2026-10-13T09:00:00Z'), endTime: new Date('2026-10-13T10:00:00Z'), duration: 60 });
  assert.deepEqual((await find('istanbul')).courses.map((course) => course.name), ['İSTANBUL TARİHİ']);
  assert.deepEqual((await find('tarihi')).courses.map((course) => course.name), ['İSTANBUL TARİHİ']);
  const sinav = (await find('SINAV')).sessions;
  assert.deepEqual(sinav.map((session) => [session.title, session.matchedIn]), [['Sınav hazırlığı', 'title']]);
  assert.deepEqual((await find('ISIK VE CAGRI')).sessions.map((session) => session.matchedIn), ['description']);
  // Another user's matching data stays out.
  assert.equal((await find('istanbul', other)).courses.length, 0);
});
