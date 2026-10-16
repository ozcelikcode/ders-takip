const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-topic-progress-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, Topic, UserTopicProgress } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const auth = (method, url, user) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
let owner, other, globalTopic, privateTopic, foreignTopic;

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
  const category = await Category.create({ name: 'Fixture category', order: 1 });
  const topicOf = async (course, name) => Topic.create({ name, courseId: course.id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  const globalCourse = await Course.create({ name: 'Global course', order: 1, categoryId: category.id, isGlobal: true });
  const privateCourse = await Course.create({ name: 'Private course', order: 2, categoryId: category.id, isGlobal: false, userId: owner.id });
  const foreignCourse = await Course.create({ name: 'Foreign course', order: 3, categoryId: category.id, isGlobal: false, userId: other.id });
  globalTopic = await topicOf(globalCourse, 'Global topic');
  privateTopic = await topicOf(privateCourse, 'Private topic');
  foreignTopic = await topicOf(foreignCourse, 'Foreign topic');
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('keeps topic progress per user and never writes it to the shared catalog', async () => {
  await auth('put', `/api/topics/${globalTopic.id}/progress`, owner).send({ status: 'completed' }).expect(200);
  await auth('put', `/api/topics/${privateTopic.id}/progress`, owner).send({ status: 'in_progress' }).expect(200);
  const mine = (await auth('get', '/api/topics/progress', owner).expect(200)).body.data.progress;
  assert.deepEqual(mine.map(entry => [entry.topicId, entry.status]), [[globalTopic.id, 'completed'], [privateTopic.id, 'in_progress']]);
  assert.equal(mine[0].courseId, globalTopic.courseId);
  assert.deepEqual((await auth('get', '/api/topics/progress', other).expect(200)).body.data.progress, []);
  assert.equal((await Topic.findByPk(globalTopic.id)).toJSON().status, undefined);
});

it('updates and clears states idempotently and rejects invisible, archived or invalid topics', async () => {
  await auth('put', `/api/topics/${globalTopic.id}/progress`, owner).send({ status: 'completed' }).expect(200);
  await auth('put', `/api/topics/${globalTopic.id}/progress`, owner).send({ status: 'not_started' }).expect(200);
  assert.equal(await UserTopicProgress.count({ where: { userId: owner.id, topicId: globalTopic.id } }), 0);
  await auth('put', `/api/topics/${foreignTopic.id}/progress`, owner).send({ status: 'completed' }).expect(404);
  await auth('put', `/api/topics/${privateTopic.id}/progress`, owner).send({ status: 'finished' }).expect(400);
  await auth('put', `/api/topics/${privateTopic.id}/progress`, owner).send({ status: 'completed', userId: other.id }).expect(400);
  await Topic.update({ isActive: false }, { where: { id: privateTopic.id } });
  await auth('put', `/api/topics/${privateTopic.id}/progress`, owner).send({ status: 'completed' }).expect(404);
  assert.deepEqual((await auth('get', '/api/topics/progress', owner).expect(200)).body.data.progress, []);
});

it('removes progress with the topic or the user', async () => {
  await Topic.update({ isActive: true }, { where: { id: privateTopic.id } });
  await auth('put', `/api/topics/${privateTopic.id}/progress`, owner).send({ status: 'completed' }).expect(200);
  await auth('put', `/api/topics/${globalTopic.id}/progress`, other).send({ status: 'completed' }).expect(200);
  await Topic.destroy({ where: { id: privateTopic.id } });
  assert.equal(await UserTopicProgress.count({ where: { topicId: privateTopic.id } }), 0);
  await User.destroy({ where: { id: other.id } });
  assert.equal(await UserTopicProgress.count({ where: { userId: other.id } }), 0);
});
