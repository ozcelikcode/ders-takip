const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-catalog-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, Topic, StudySession, SessionInterval, UserTopicProgress } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
let owner, other, admin, source, target, course, topics;
const auth = (method, url, user = owner) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const categoryBody = name => ({ name, color: '#123456', order: 1 });
const courseBody = name => ({ ...categoryBody(name), categoryId: source.id });
const topicBody = name => ({ name, courseId: course.id, difficulty: 'Kolay', estimatedTime: 30 });
const snapshot = () => topics.map(topic => ({ id: topic.id, updatedAt: topic.updatedAt.toISOString() }));
const reorderBody = (ids = topics.map(topic => topic.id).reverse()) => ({ expectedTopics: snapshot(), topicOrders: ids.map((id, index) => ({ id, order: index + 1 })) });
const reorder = (body = reorderBody(), user = owner) => auth('put', `/api/topics/course/${course.id}/reorder`, user).send(body);
const databaseSnapshot = async () => {
  const result = {};
  for (const table of ['categories', 'courses', 'topics', 'study_sessions', 'session_intervals']) {
    result[table] = (await sequelize.query(`SELECT * FROM ${table} ORDER BY id`))[0];
  }
  return result;
};
async function sessionFixture() {
  const session = await StudySession.create({ userId: other.id, courseId: course.id, topicId: topics[0].id, title: 'Preserved history', notes: 'Preserve user notes', startTime: new Date('2026-01-01T09:00:00Z'), endTime: new Date('2026-01-01T10:00:00Z'), duration: 60, status: 'completed', sessionType: 'study' });
  await SessionInterval.create({ sessionId: session.id, kind: 'study', startedAt: new Date('2026-01-01T09:00:00Z'), endedAt: new Date('2026-01-01T09:05:00Z') });
  return session;
}
before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other', 'admin']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: name === 'admin' ? 'admin' : 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else if (name === 'other') other = user; else admin = user;
  }
});
beforeEach(async () => {
  await StudySession.destroy({ where: {} }); await Course.destroy({ where: {} }); await Category.destroy({ where: {} });
  source = await Category.create(categoryBody('Source')); target = await Category.create(categoryBody('Target'));
  course = await Course.create({ ...courseBody('Owned course'), userId: owner.id });
  topics = [];
  for (let order = 1; order <= 3; order++) topics.push(await Topic.create({ ...topicBody(`Topic ${order}`), order }));
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('deletes a course and all topics while preserving measured history and advancing detached session versions', async () => {
  const session = await sessionFixture();
  const before = await databaseSnapshot();
  await auth('delete', `/api/courses/${course.id}`).expect(200);
  assert.equal(await Course.findByPk(course.id), null); assert.equal(await Topic.count(), 0);
  const saved = await session.reload();
  assert.equal(saved.courseId, null); assert.equal(saved.topicId, null);
  assert.ok(saved.updatedAt > new Date(before.study_sessions[0].updatedAt));
  const after = await databaseSnapshot();
  const updatedAt = before.study_sessions[0].updatedAt;
  const oldValues = { ...before.study_sessions[0] }; const newValues = { ...after.study_sessions[0] };
  for (const key of ['courseId', 'topicId', 'updatedAt']) { delete oldValues[key]; delete newValues[key]; }
  assert.deepEqual(newValues, oldValues); assert.deepEqual(after.session_intervals, before.session_intervals);
  await auth('put', `/api/study-sessions/${session.id}`, other).send({ expectedUpdatedAt: new Date(updatedAt).toISOString(), notes: 'Stale' }).expect(409);
  const stats = (await auth('get', '/api/study-sessions/stats', other).expect(200)).body.data.stats;
  assert.equal(stats.studySeconds, 300);
  assert.deepEqual((await sequelize.query('PRAGMA foreign_key_check'))[0], []);
});
it('rolls back course cascades, session links and versions when deletion fails after SQL', async () => {
  await sessionFixture(); const before = await databaseSnapshot();
  Course.addHook('afterDestroy', 'failure', () => { throw new Error('Private cascade failure'); });
  try {
    const response = await auth('delete', `/api/courses/${course.id}`).expect(500);
    assert.equal(JSON.stringify(response.body).includes('Private cascade failure'), false);
  } finally { Course.removeHook('afterDestroy', 'failure'); }
  assert.deepEqual(await databaseSnapshot(), before);
});
it('rolls back the first session detach when a later write fails', async () => {
  await sessionFixture(); const before = await databaseSnapshot();
  StudySession.addHook('afterUpdate', 'failure', () => { throw new Error('Private detach failure'); });
  try { await auth('delete', `/api/courses/${course.id}`).expect(500); }
  finally { StudySession.removeHook('afterUpdate', 'failure'); }
  assert.deepEqual(await databaseSnapshot(), before);
});
it('keeps foreign and global catalogs read-only for students across all mutation paths', async () => {
  const before = await databaseSnapshot();
  await auth('delete', `/api/courses/${course.id}`, other).expect(403);
  await auth('put', `/api/courses/${course.id}`, other).send({ name: 'Forbidden' }).expect(403);
  await auth('post', '/api/topics', other).send(topicBody('Forbidden')).expect(403);
  await auth('put', `/api/topics/${topics[0].id}`, other).send({ order: 4 }).expect(403);
  await auth('delete', `/api/topics/${topics[0].id}`, other).expect(403);
  await reorder(reorderBody(), other).expect(403);
  await auth('delete', `/api/categories/${source.id}`).expect(403);
  assert.deepEqual(await databaseSnapshot(), before);
  await course.update({ isGlobal: true });
  await auth('delete', `/api/courses/${course.id}`).expect(403);
  await reorder().expect(403);
  await auth('delete', `/api/topics/${topics[0].id}`).expect(403);
  await reorder(reorderBody(), admin).expect(200);
});
it('rejects self migration, missing targets and populated-category deletion without changing data', async () => {
  const before = await databaseSnapshot();
  await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: source.id }).expect(400);
  await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: 999999 }).expect(404);
  await auth('delete', `/api/categories/${source.id}`, admin).expect(409);
  assert.deepEqual(await databaseSnapshot(), before);
  await auth('delete', `/api/categories/${target.id}`, admin).send({ migrateToCategoryId: target.id }).expect(400);
  await auth('delete', `/api/categories/${target.id}`, admin).expect(200);
});
it('migrates personal, global and inactive courses atomically and keeps sessions and intervals intact', async () => {
  await sessionFixture();
  await Course.create({ ...courseBody('Global course'), userId: admin.id, isGlobal: true });
  await Course.create({ ...courseBody('Inactive course'), userId: other.id, isActive: false });
  const before = await databaseSnapshot();
  const response = await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }).expect(200);
  assert.equal(response.body.data.migratedCoursesCount, 3);
  assert.equal(await Category.findByPk(source.id), null);
  assert.equal(await Course.count({ where: { categoryId: target.id } }), 3);
  const after = await databaseSnapshot();
  assert.deepEqual(after.topics, before.topics); assert.deepEqual(after.study_sessions, before.study_sessions); assert.deepEqual(after.session_intervals, before.session_intervals);
});
it('rolls back category migration after both an intermediate course update and the final category delete', async () => {
  await Course.create({ ...courseBody('Another course'), userId: other.id });
  await sessionFixture(); const before = await databaseSnapshot();
  for (const [model, hook] of [[Course, 'afterUpdate'], [Category, 'afterDestroy']]) {
    model.addHook(hook, 'failure', () => { throw new Error('Private migration failure'); });
    try {
      const response = await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }).expect(500);
      assert.equal(JSON.stringify(response.body).includes('Private migration failure'), false);
    } finally { model.removeHook(hook, 'failure'); }
    assert.deepEqual(await databaseSnapshot(), before);
  }
});
it('rejects migration name conflicts but allows names private to different owners', async () => {
  const duplicate = await Course.create({ ...courseBody(course.name), categoryId: target.id, userId: owner.id });
  const before = await databaseSnapshot();
  await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }).expect(409);
  assert.deepEqual(await databaseSnapshot(), before);
  await duplicate.update({ userId: other.id });
  await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }).expect(200);
});
it('serializes category migration against course creation without orphaning courses', async () => {
  const [created, migrated] = await Promise.all([
    auth('post', '/api/courses').send(courseBody('Racing course')),
    auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }),
  ]);
  assert.equal(migrated.status, 200); assert.ok([201, 404].includes(created.status));
  assert.equal(await Course.count({ where: { categoryId: source.id } }), 0);
  assert.equal(await Course.count({ where: { categoryId: target.id } }), created.status === 201 ? 2 : 1);
  assert.deepEqual((await sequelize.query('PRAGMA foreign_key_check'))[0], []);
});
it('serializes opposite category migrations and preserves every course', async () => {
  const results = await Promise.all([
    auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: target.id }),
    auth('delete', `/api/categories/${target.id}`, admin).send({ migrateToCategoryId: source.id }),
  ]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 404]);
  assert.equal(await Course.count(), 1); assert.equal(await Topic.count(), 3); assert.equal(await Category.count(), 1);
});
it('applies a full topic permutation and leaves a no-op snapshot unchanged', async () => {
  const read = (await auth('get', `/api/courses/${course.id}?includeTopics=true`).expect(200)).body.data.course;
  assert.ok(read.topics.every(topic => typeof topic.updatedAt === 'string'));
  const noop = reorderBody(topics.map(topic => topic.id));
  await reorder(noop).expect(200); assert.deepEqual(snapshot(), (await Topic.findAll({ order: [['id', 'ASC']] })).map(topic => ({ id: topic.id, updatedAt: topic.updatedAt.toISOString() })));
  const response = await reorder().expect(200);
  assert.deepEqual(response.body.data.topics.map(topic => topic.id), topics.map(topic => topic.id).reverse());
  assert.deepEqual(response.body.data.topics.map(topic => topic.order), [1, 2, 3]);
});
it('rejects malformed, duplicate, partial, inactive and cross-course reorder payloads without writes', async () => {
  const archived = await Topic.create({ ...topicBody('Archived'), order: 7, isActive: false });
  const foreignCourse = await Course.create({ ...courseBody('Other course'), userId: other.id });
  const foreign = await Topic.create({ ...topicBody('Foreign topic'), courseId: foreignCourse.id, order: 1 });
  const valid = reorderBody(); const before = await databaseSnapshot();
  const invalid = [
    {}, { topicOrders: valid.topicOrders }, { ...valid, unknown: true },
    { ...valid, topicOrders: [{ id: topics[0].id, order: 0 }] },
    { ...valid, topicOrders: valid.topicOrders.map(topic => ({ ...topic, id: String(topic.id) })) },
    { ...valid, topicOrders: valid.topicOrders.map(topic => ({ ...topic, order: 1 })) },
    { ...valid, topicOrders: [valid.topicOrders[0], valid.topicOrders[0], valid.topicOrders[1]] },
    { ...valid, expectedTopics: [valid.expectedTopics[0], valid.expectedTopics[0], valid.expectedTopics[1]] },
    { ...valid, topicOrders: valid.topicOrders.map(topic => ({ ...topic, order: topic.order + 1 })) },
  ];
  for (const body of invalid) await reorder(body).expect(400);
  const partial = { topicOrders: [{ id: topics[0].id, order: 1 }], expectedTopics: [snapshot()[0]] };
  await reorder(partial).expect(409);
  for (const id of [archived.id, foreign.id, 999999]) {
    await reorder({ topicOrders: [{ id, order: 1 }], expectedTopics: [{ id, updatedAt: topics[0].updatedAt.toISOString() }] }).expect(409);
  }
  assert.deepEqual(await databaseSnapshot(), before);
});
it('detects stale reorder after topic edits, creation or archival', async () => {
  const original = reorderBody();
  await auth('put', `/api/topics/${topics[0].id}`).send({ name: 'Edited' }).expect(200);
  await reorder(original).expect(409);
  topics = await Topic.findAll({ where: { courseId: course.id, isActive: true }, order: [['id', 'ASC']] });
  const beforeCreate = reorderBody();
  const created = (await auth('post', '/api/topics').send(topicBody('Added')).expect(201)).body.data.topic;
  await reorder(beforeCreate).expect(409);
  topics = await Topic.findAll({ where: { courseId: course.id, isActive: true }, order: [['id', 'ASC']] });
  const beforeDelete = reorderBody();
  await auth('delete', `/api/topics/${created.id}`).expect(200);
  await reorder(beforeDelete).expect(409);
});
it('rejects one of two concurrent permutations from the same snapshot', async () => {
  const results = await Promise.all([reorder(), reorder(reorderBody([topics[1].id, topics[0].id, topics[2].id]))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const saved = await Topic.findAll({ order: [['order', 'ASC']] });
  assert.deepEqual(saved.map(topic => topic.id), results.find(result => result.status === 200).body.data.topics.map(topic => topic.id));
});
it('rolls back all topic orders and versions after an intermediate SQL write fails', async () => {
  const before = await databaseSnapshot();
  Topic.addHook('afterUpdate', 'failure', () => { throw new Error('Private reorder failure'); });
  try { await reorder().expect(500); }
  finally { Topic.removeHook('afterUpdate', 'failure'); }
  assert.deepEqual(await databaseSnapshot(), before);
  await reorder().expect(200);
});
it('keeps topic versions monotonic even when persisted timestamps are ahead of the clock', async () => {
  await sequelize.query('UPDATE topics SET updatedAt = :updatedAt WHERE id = :id', { replacements: { id: topics[0].id, updatedAt: new Date(Date.now() + 60000) } });
  topics = await Topic.findAll({ where: { courseId: course.id }, order: [['id', 'ASC']] });
  const previous = topics[0].updatedAt.getTime();
  const response = await reorder().expect(200);
  assert.equal(new Date(response.body.data.topics.find(topic => topic.id === topics[0].id).updatedAt).getTime(), previous + 1);
});
it('allocates unique topic positions and rejects duplicate names under concurrent creates', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, (_, index) => auth('post', '/api/topics').send({ ...topicBody(`Concurrent ${index}`), order: 1 })));
  assert.ok(results.every(result => result.status === 201));
  assert.deepEqual(results.map(result => result.body.data.topic.order).sort(), [4, 5, 6, 7]);
  const duplicates = await Promise.all([1, 2].map(() => auth('post', '/api/topics').send(topicBody('Duplicate'))));
  assert.deepEqual(duplicates.map(result => result.status).sort(), [201, 409]);
});
it('archives topics without losing history, allows reusing archived names, and resolves active-order collisions on reactivation', async () => {
  await sessionFixture();
  const before = await databaseSnapshot();
  await auth('delete', `/api/topics/${topics[0].id}`).expect(200);
  assert.equal(await Topic.count(), 3); assert.equal((await topics[0].reload()).isActive, false);
  assert.equal(await Topic.count({ where: { courseId: course.id } }), 3);
  topics = topics.slice(1);
  await reorder().expect(200);
  const recreated = (await auth('post', '/api/topics').send(topicBody('Topic 1')).expect(201)).body.data.topic;
  assert.equal(recreated.order, 3);
  await auth('delete', `/api/topics/${recreated.id}`).expect(200);
  const response = await auth('put', `/api/topics/${before.topics[0].id}`).send({ isActive: true }).expect(200);
  assert.equal(response.body.data.topic.order, 3);
  const after = await databaseSnapshot();
  assert.deepEqual(after.study_sessions, before.study_sessions); assert.deepEqual(after.session_intervals, before.session_intervals);
});
it('validates IDs, booleans, integer positions, localized difficulty and unknown write fields before mutation', async () => {
  const before = await databaseSnapshot();
  for (const id of ['0', '-1', '1.2', '1e2', '9007199254740992']) {
    await auth('delete', `/api/courses/${id}`).expect(400);
    await auth('delete', `/api/categories/${id}`, admin).expect(400);
    await auth('delete', `/api/topics/${id}`).expect(400);
  }
  for (const patch of [{ order: 0 }, { order: 1.5 }, { isActive: 'false' }, { courseId: 99 }, { difficulty: 'Easy' }]) {
    await auth('put', `/api/topics/${topics[0].id}`).send(patch).expect(400);
  }
  await auth('put', `/api/courses/${course.id}`).send({ userId: other.id }).expect(400);
  await auth('delete', `/api/categories/${source.id}`, admin).send({ migrateToCategoryId: String(target.id) }).expect(400);
  await auth('post', '/api/topics').send({ ...topicBody('Too short'), estimatedTime: 1 }).expect(400);
  await auth('post', '/api/categories', admin).send({ ...categoryBody('Bad order'), order: 0 }).expect(400);
  assert.deepEqual(await databaseSnapshot(), before);
});
it('prevents course-name races across create, update and global visibility changes', async () => {
  const results = await Promise.all([1, 2].map(() => auth('post', '/api/courses').send(courseBody('Same name'))));
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  await auth('put', `/api/courses/${course.id}`).send({ name: 'Same name' }).expect(409);
  const foreign = (await auth('post', '/api/courses', other).send(courseBody('Same name')).expect(201)).body.data.course;
  await auth('put', `/api/courses/${foreign.id}`, admin).send({ isGlobal: true }).expect(409);
  await auth('post', '/api/courses').send({ ...courseBody('Forbidden global'), isGlobal: true }).expect(403);
});
it('detaches legacy cross-links selectively and preserves an open measured interval', async () => {
  const session = await sessionFixture();
  const remainingCourse = await Course.create({ ...courseBody('Remaining course'), userId: other.id });
  await session.update({ courseId: remainingCourse.id, status: 'in_progress' });
  const interval = await SessionInterval.findOne({ where: { sessionId: session.id } });
  await interval.update({ endedAt: null });
  const before = interval.toJSON();
  await topics[2].update({ isActive: false });
  await auth('delete', `/api/courses/${course.id}`).expect(200);
  await session.reload();
  assert.equal(session.courseId, remainingCourse.id); assert.equal(session.topicId, null); assert.equal(session.status, 'in_progress');
  assert.deepEqual((await interval.reload()).toJSON(), before);
  assert.equal(await Topic.count(), 0);
});

it('rejects an archived-name collision on restore atomically and restores preserved progress after renaming', async () => {
  await sessionFixture();
  await UserTopicProgress.create({ userId: owner.id, topicId: topics[0].id, status: 'completed' });
  const archivedId = topics[0].id;
  await auth('delete', `/api/topics/${archivedId}`).expect(200);
  await auth('post', '/api/topics').send(topicBody('Topic 1')).expect(201);
  const before = await databaseSnapshot();
  const progressBefore = (await UserTopicProgress.findOne({ where: { topicId: archivedId } })).toJSON();
  const collision = await auth('put', `/api/topics/${archivedId}`).send({ isActive: true }).expect(409);
  assert.match(collision.body.error.message, /aynı isimde/);
  assert.deepEqual(await databaseSnapshot(), before);
  assert.deepEqual((await UserTopicProgress.findOne({ where: { topicId: archivedId } })).toJSON(), progressBefore);
  const restored = (await auth('put', `/api/topics/${archivedId}`).send({ isActive: true, name: 'Restored topic' }).expect(200)).body.data.topic;
  assert.equal(restored.isActive, true); assert.equal(restored.name, 'Restored topic');
  const after = await databaseSnapshot();
  assert.deepEqual(after.study_sessions, before.study_sessions); assert.deepEqual(after.session_intervals, before.session_intervals);
  assert.deepEqual((await UserTopicProgress.findOne({ where: { topicId: archivedId } })).toJSON(), progressBefore);
  const visible = (await auth('get', '/api/topics/progress').expect(200)).body.data.progress;
  assert.ok(visible.some(entry => entry.topicId === archivedId && entry.status === 'completed'));
});
it('serializes concurrent restoration of archived topics with the same name', async () => {
  const first = topics[0];
  await auth('delete', `/api/topics/${first.id}`).expect(200);
  const second = (await auth('post', '/api/topics').send(topicBody(first.name)).expect(201)).body.data.topic;
  await auth('delete', `/api/topics/${second.id}`).expect(200);
  const responses = await Promise.all([first.id, second.id].map(id => auth('put', `/api/topics/${id}`).send({ isActive: true })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(await Topic.count({ where: { name: first.name, isActive: true } }), 1);
});
