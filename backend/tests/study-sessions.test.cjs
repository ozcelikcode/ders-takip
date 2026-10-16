const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-sessions-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, StudySession, Category, Course, Topic } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
let owner, other;
const auth = (method, url, user = owner) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const body = (start = '2099-01-01T09:00:00Z', end = '2099-01-01T10:00:00Z') => ({ title: 'Session fixture', startTime: start, endTime: end });
const version = session => ({ expectedUpdatedAt: session.updatedAt });
const create = async (start, end, user) => (await auth('post', '/api/study-sessions', user).send(body(start, end)).expect(201)).body.data.session;
const put = async (session, patch, status = 200) => (await auth('put', `/api/study-sessions/${session.id}`).send({ ...patch, ...version(session) }).expect(status)).body.data?.session;
const action = async (session, name, patch = {}, status = 200) => (await auth('patch', `/api/study-sessions/${session.id}/${name}`).send({ ...patch, ...version(session) }).expect(status)).body.data?.session;
before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
});
beforeEach(async () => { await StudySession.destroy({ where: {} }); });
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('serializes simultaneous overlapping creates and commits exactly one session', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => auth('post', '/api/study-sessions').send(body())));
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409, 409, 409]);
  assert.equal(await StudySession.count(), 1);
});
it('allows adjacent boundaries and independent users but rejects every overlap shape', async () => {
  await create();
  await create('2099-01-01T10:00:00Z', '2099-01-01T11:00:00Z');
  await create(undefined, undefined, other);
  for (const [start, end] of [['08:30', '09:30'], ['09:30', '10:30'], ['08:00', '11:00'], ['09:15', '09:45'], ['09:00', '10:00']]) {
    await auth('post', '/api/study-sessions').send(body(`2099-01-01T${start}:00Z`, `2099-01-01T${end}:00Z`)).expect(409);
  }
  assert.equal(await StudySession.count(), 3);
});
it('checks partial moves and resize atomically, excluding the current session', async () => {
  const first = await create();
  const second = await create('2099-01-01T11:00:00Z', '2099-01-01T12:00:00Z');
  await put(second, { startTime: '2099-01-01T09:30:00Z', title: 'Must roll back' }, 409);
  await put(first, { endTime: '2099-01-01T11:30:00Z' }, 409);
  const unchanged = await StudySession.findByPk(second.id);
  assert.equal(unchanged.title, second.title); assert.equal(unchanged.updatedAt.toISOString(), second.updatedAt);
  const moved = await put(first, { startTime: '2099-01-01T09:15:00Z' });
  assert.equal(moved.duration, 45);
  await put(moved, { endTime: '2099-01-01T11:00:00Z' });
});
it('serializes two different sessions moving into the same free slot', async () => {
  const first = await create();
  const second = await create('2099-01-01T11:00:00Z', '2099-01-01T12:00:00Z');
  const results = await Promise.all([first, second].map(session => auth('put', `/api/study-sessions/${session.id}`).send({ ...version(session), startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
});
it('rejects invalid, ambiguous, zero, negative and over-24-hour schedules without writes', async () => {
  for (const [start, end] of [['2099-01-01', '2099-01-02'], ['invalid', 'invalid'], ['2099-01-01T09:00:00Z', '2099-01-01T09:00:00Z'], ['2099-01-01T09:00:00Z', '2099-01-01T08:00:00Z'], ['2099-01-01T09:00:00Z', '2099-01-02T09:00:01Z'], ['2099-01-01T09:00:00Z', '2099-01-01T09:00:30Z']]) {
    await auth('post', '/api/study-sessions').send(body(start, end)).expect(400);
  }
  assert.equal(await StudySession.count(), 0);
  const session = await create();
  await put(session, { startTime: session.endTime }, 400);
  assert.equal((await StudySession.findByPk(session.id)).updatedAt.toISOString(), session.updatedAt);
});
it('requires a version and rejects stale concurrent edits, actions and deletes', async () => {
  const session = await create();
  await auth('put', `/api/study-sessions/${session.id}`).send({ title: 'No version' }).expect(400);
  const results = await Promise.all(['First', 'Second'].map(title => auth('put', `/api/study-sessions/${session.id}`).send({ title, ...version(session) })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  await action(session, 'start', {}, 409);
  await auth('delete', `/api/study-sessions/${session.id}`).send(version(session)).expect(409);
  assert.equal(await StudySession.count(), 1);
});
it('enforces the same transition policy through general PUT and action endpoints', async () => {
  let session = await create();
  await put(session, { status: 'paused' }, 409);
  await action(session, 'pause', {}, 409);
  session = await action(session, 'start');
  session = await put(session, { status: 'paused' });
  session = await action(session, 'start');
  session = await action(session, 'complete');
  await action(session, 'start', {}, 409);
  await put(session, { status: 'in_progress' }, 409);
  await put(session, { status: 'cancelled' }, 409);
  const reopened = await put(session, { status: 'planned' });
  assert.equal(reopened.completedAt, null);
});
it('preserves completion time and version on repeated completion, with notes edited separately', async () => {
  const session = await create();
  const completed = await action(session, 'complete', { notes: 'Keep this', productivity: 4 });
  const repeated = await action(completed, 'complete', { notes: 'Keep this', productivity: 4 });
  assert.equal(repeated.completedAt, completed.completedAt); assert.equal(repeated.updatedAt, completed.updatedAt);
  const throughPut = await put(repeated, { status: 'completed' });
  assert.equal(throughPut.completedAt, completed.completedAt); assert.equal(throughPut.updatedAt, completed.updatedAt);
});
it('reserves paused and completed intervals, frees cancelled time and rejects overlapping reactivation', async () => {
  let session = await create();
  session = await action(session, 'start'); session = await action(session, 'pause');
  await auth('post', '/api/study-sessions').send(body()).expect(409);
  session = await action(session, 'complete');
  await auth('post', '/api/study-sessions').send(body()).expect(409);
  session = await put(session, { status: 'planned' }); session = await put(session, { status: 'cancelled' });
  await create();
  await put(session, { status: 'planned' }, 409);
  await action(session, 'complete', {}, 409);
});
it('permits at most one running session per user under concurrent starts', async () => {
  const first = await create(); const second = await create('2099-01-02T09:00:00Z', '2099-01-02T10:00:00Z');
  const results = await Promise.all([first, second].map(session => auth('patch', `/api/study-sessions/${session.id}/start`).send(version(session))));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const active = results.find(result => result.status === 200).body.data.session;
  const inactive = active.id === first.id ? second : first;
  await put(inactive, { status: 'in_progress' }, 409);
  await action(active, 'pause'); await action(inactive, 'start');
  const foreign = await create(undefined, undefined, other);
  await auth('patch', `/api/study-sessions/${foreign.id}/start`, other).send(version(foreign)).expect(200);
});
it('does not reset an overdue active session when pausing and rejects starting an expired plan', async () => {
  const session = await StudySession.create({ userId: owner.id, title: 'Historical', startTime: new Date('2020-01-01T09:00:00Z'), endTime: new Date('2020-01-01T10:00:00Z'), duration: 60, sessionType: 'study', status: 'in_progress', notes: 'Preserve' });
  const paused = await action(session.toJSON(), 'pause');
  assert.equal(paused.status, 'paused'); assert.equal(paused.notes, 'Preserve');
  await action(paused, 'start', {}, 409);
  assert.equal((await StudySession.findByPk(session.id)).status, 'paused');
  await action(paused, 'complete');
});
it('isolates all writes by owner, including valid foreign versions', async () => {
  const session = await create(undefined, undefined, other);
  await put(session, { title: 'Forbidden' }, 404);
  await action(session, 'complete', {}, 404);
  await auth('delete', `/api/study-sessions/${session.id}`).send(version(session)).expect(404);
});
it('keeps updatedAt monotonic when the previous timestamp is ahead of the server clock', async () => {
  const session = await create();
  const ahead = new Date(Date.now() + 60_000).toISOString();
  await sequelize.query('UPDATE study_sessions SET updatedAt = :updatedAt WHERE id = :id', { replacements: { id: session.id, updatedAt: new Date(ahead) } });
  const current = (await auth('get', `/api/study-sessions/${session.id}`).expect(200)).body.data.session;
  const updated = await put(current, { title: 'Changed' });
  assert.equal(new Date(updated.updatedAt).getTime(), new Date(ahead).getTime() + 1);
  await auth('delete', `/api/study-sessions/${session.id}`).send(version(updated)).expect(200);
});
it('validates changed relations in the same transaction and rejects private or mismatched topics', async () => {
  const category = await Category.create({ name: 'Session relations', color: '#123456', order: 1 });
  const ownCourse = await Course.create({ name: 'Owned', categoryId: category.id, userId: owner.id, isActive: true, color: '#123456', order: 1 });
  const foreignCourse = await Course.create({ name: 'Foreign', categoryId: category.id, userId: other.id, isActive: true, color: '#123456', order: 1 });
  const topic = await Topic.create({ name: 'Owned topic', courseId: ownCourse.id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  const foreignTopic = await Topic.create({ name: 'Foreign topic', courseId: foreignCourse.id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  let session = await create();
  await put(session, { courseId: foreignCourse.id, title: 'Forbidden' }, 400);
  await put(session, { topicId: foreignTopic.id }, 400);
  session = await put(session, { topicId: topic.id }); assert.equal(session.courseId, ownCourse.id);
  await put(session, { courseId: foreignCourse.id }, 400);
  assert.equal((await StudySession.findByPk(session.id)).courseId, ownCourse.id);
});
it('rolls back status, metadata and version when a write fails after the SQL update', async () => {
  const session = await create();
  StudySession.addHook('afterUpdate', 'session-failure-fixture', () => { throw new Error('Private session failure fixture'); });
  try {
    const response = await auth('put', `/api/study-sessions/${session.id}`).send({ ...version(session), status: 'completed', notes: 'Must roll back' }).expect(500);
    assert.equal(JSON.stringify(response.body).includes('Private session failure fixture'), false);
  } finally { StudySession.removeHook('afterUpdate', 'session-failure-fixture'); }
  const saved = await StudySession.findByPk(session.id);
  assert.equal(saved.status, 'planned'); assert.equal(saved.notes, null); assert.equal(saved.completedAt, null);
  assert.equal(saved.updatedAt.toISOString(), session.updatedAt);
  await action(session, 'start');
});
