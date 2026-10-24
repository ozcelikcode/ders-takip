const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-account-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups'), FRONTEND_URL: 'http://app.test' });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { Category, Course, Plan, SessionInterval, StudySession, Topic, User, UserTopicProgress } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');

let owner, other, admin, sharedCourse, sharedTopic;
const token = async (user) => {
  user.sessionId ??= (await createAuthSession(user)).session.id;
  return generateAccessToken({ id: String(user.id), sid: user.sessionId });
};
const call = async (method, url, user, body) => {
  const operation = request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(await token(user), { type: 'bearer' });
  return body === undefined ? operation : operation.send(body);
};
const create = (name, extra = {}) => User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', ...extra });
const slot = { startTime: new Date('2026-10-12T09:00:00Z'), endTime: new Date('2026-10-12T10:00:00Z'), duration: 60 };

async function seedWorkspace(user, label) {
  const category = await Category.create({ name: `${label} kategori`, color: '#111111', order: 2, userId: user.id });
  const course = await Course.create({ name: `${label} kayıt`, categoryId: category.id, userId: user.id, color: '#111111', order: 1 });
  const topic = await Topic.create({ name: `${label} konu`, courseId: course.id, estimatedTime: 30, difficulty: 'Orta', order: 1 });
  const session = await StudySession.create({ userId: user.id, title: `${label} seans`, courseId: course.id, topicId: topic.id, ...slot });
  await SessionInterval.create({ sessionId: session.id, kind: 'study', startedAt: slot.startTime, endedAt: slot.endTime });
  await UserTopicProgress.create({ userId: user.id, topicId: sharedTopic.id, status: 'completed' });
  await Plan.create({ userId: user.id, title: `${label} plan`, startDate: '2026-10-12', endDate: '2026-10-18' });
  return { category, course, topic, session };
}

before(async () => {
  await applyMigrations();
  admin = await create('admin', { role: 'admin' });
  owner = await create('owner');
  other = await create('other');
  const shared = await Category.create({ name: 'Ortak', color: '#222222', order: 1, userId: null });
  sharedCourse = await Course.create({ name: 'Ortak kayıt', categoryId: shared.id, isGlobal: true, color: '#222222', order: 1 });
  sharedTopic = await Topic.create({ name: 'Ortak konu', courseId: sharedCourse.id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  await seedWorkspace(owner, 'Sahip');
  await seedWorkspace(other, 'Diğer');
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('exports only the account\'s own data, as a downloadable file without secrets', async () => {
  const response = await call('get', '/api/auth/account/export', owner);
  assert.equal(response.status, 200);
  assert.match(response.headers['content-disposition'], /^attachment; filename="hesap-verisi-\d{4}-\d{2}-\d{2}\.json"$/);
  assert.equal(response.headers['cache-control'], 'no-store');
  const data = response.body;
  assert.equal(data.format, 'study-tracker-account-export');
  assert.equal(data.version, 2);
  assert.equal(data.account.username, 'owner');
  assert.deepEqual(data.categories.map((row) => row.name), ['Sahip kategori']);
  assert.deepEqual(data.courses.map((row) => [row.name, row.topics.map((topic) => topic.name)]), [['Sahip kayıt', ['Sahip konu']]]);
  assert.deepEqual(data.sessions.map((row) => [row.title, row.activityIntervals.length]), [['Sahip seans', 1]]);
  assert.deepEqual(data.plans.map((row) => row.title), ['Sahip plan']);
  // Progress on a shared topic is the user's own and carries the names needed to read it later.
  assert.deepEqual(data.topicProgress.map((row) => [row.status, row.topic.name, row.topic.course.name]), [['completed', 'Ortak konu', 'Ortak kayıt']]);
  // Shared records the data points at are named, so another site can match them.
  assert.deepEqual(data.references, {
    categories: [{ id: sharedCourse.categoryId, name: 'Ortak', color: '#222222' }],
    courses: [{ id: sharedCourse.id, name: 'Ortak kayıt', color: '#222222', categoryId: sharedCourse.categoryId }],
    topics: [{ id: sharedTopic.id, courseId: sharedCourse.id, name: 'Ortak konu', estimatedTime: 30, difficulty: 'Kolay' }],
  });
  const text = JSON.stringify(data);
  assert.equal(text.includes('Diğer'), false);
  assert.equal(/password|\$2[aby]\$/.test(text), false);
  assert.equal((await request(app).get('/api/auth/account/export').set('X-Requested-With', 'StudyTracker')).status, 401);
});

it('deletes an account only with its password and removes everything it owned', async () => {
  const wrong = await call('delete', '/api/auth/account', owner, { password: 'not-the-password' });
  assert.deepEqual([wrong.status, wrong.body.error.code], [400, 'wrongPassword']);
  assert.ok(await User.findByPk(owner.id));
  assert.equal((await call('delete', '/api/auth/account', owner, {})).status, 400);

  const done = await call('delete', '/api/auth/account', owner, { password: 'fixture-password' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.match(String(done.headers['set-cookie']), /study_refresh=;/);
  assert.equal(await User.findByPk(owner.id), null);
  for (const model of [Category, Course, StudySession, Plan, UserTopicProgress]) {
    assert.equal(await model.count({ where: { userId: owner.id } }), 0, model.name);
  }
  assert.equal(await Topic.count({ where: { name: 'Sahip konu' } }), 0);
  assert.equal(await SessionInterval.count(), 1);
  // Shared data and other accounts are untouched.
  assert.ok(await Topic.findByPk(sharedTopic.id));
  assert.equal(await StudySession.count({ where: { userId: other.id } }), 1);
  assert.deepEqual(await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT }), []);
  // The old access token no longer works.
  assert.equal((await call('get', '/api/auth/me', owner)).status, 401);
});

it('keeps the last active administrator', async () => {
  const last = await call('delete', '/api/auth/account', admin, { password: 'fixture-password' });
  assert.deepEqual([last.status, last.body.error.code], [409, 'lastAdmin']);
  const second = await create('second', { role: 'admin' });
  assert.equal((await call('delete', '/api/auth/account', admin, { password: 'fixture-password' })).status, 200);
  // The remaining administrator still manages accounts through the admin route, which shares the deletion rules.
  assert.equal((await call('delete', `/api/users/${other.id}`, second)).status, 200);
  assert.equal(await Category.count({ where: { userId: other.id } }), 0);
});
