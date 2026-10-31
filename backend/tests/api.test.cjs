const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-api-'));
Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'),
  DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups'),
});

const app = require('../dist/app').default;
const { sequelize, connectDB, databasePath } = require('../dist/config/database');
const { applyMigrations, assertDatabaseReady } = require('../dist/database/migrations');
const { createAuthSession } = require('../dist/services/authSessions');
const { User, Category, Course, Topic, StudySession } = require('../dist/models');
const fixture = {};

function token(user) { return user.testAccessToken; }
function authorized(method, url, user = fixture.owner) { return request(app)[method](url).auth(token(user), { type: 'bearer' }).set('X-Requested-With', 'StudyTracker'); }
function sessionBody(overrides = {}) {
  return { title: 'Study fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T10:00:00Z', ...overrides };
}

before(async () => {
  await applyMigrations();
  for (const [name, role] of [['owner', 'student'], ['other', 'student'], ['admin', 'admin']]) {
    fixture[name] = await User.create({ username: name, email: `${name}@example.com`, password: 'test-password-only', firstName: 'Test', lastName: 'User', role });
  }
  for (const user of Object.values(fixture)) user.testAccessToken = (await createAuthSession(user)).tokens.accessToken;
  fixture.category = await Category.create({ name: 'Education', color: '#123456', order: 1 });
  for (const [name, user, isGlobal, isActive] of [['ownCourse', fixture.owner, false, true], ['otherCourse', fixture.other, false, true], ['globalCourse', fixture.admin, true, true], ['inactiveCourse', fixture.owner, false, false]]) {
    fixture[name] = await Course.create({ name, categoryId: fixture.category.id, userId: user.id, isGlobal, isActive, color: '#123456', order: 1 });
    fixture[`${name}Topic`] = await Topic.create({ name: `${name} topic`, courseId: fixture[name].id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  }
});

after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

describe('resource access over HTTP and SQLite', () => {
  it('logs in with credentials and authenticates the issued access token', async () => {
    const response = await request(app).post('/api/auth/login').set('X-Requested-With', 'StudyTracker').send({ email: fixture.owner.email, password: 'test-password-only' }).expect(200);
    assert.equal(response.body.data.tokens.refreshToken, undefined);
    assert.match(response.headers['set-cookie'][0], /HttpOnly/);
    const profile = await request(app).get('/api/auth/me').set('X-Requested-With', 'StudyTracker').auth(response.body.data.tokens.accessToken, { type: 'bearer' }).expect(200);
    assert.equal(profile.body.data.user.id, fixture.owner.id);
  });
  it('rejects anonymous reads', async () => { await request(app).get('/api/courses').expect(401); });
  it('lists only owned and global courses', async () => {
    const response = await authorized('get', '/api/courses?includeTopics=true').expect(200);
    assert.deepEqual(response.body.data.courses.map((course) => course.id).sort(), [fixture.ownCourse.id, fixture.globalCourse.id].sort());
  });
  it('allows owners and admins to read a private course', async () => {
    await authorized('get', `/api/courses/${fixture.ownCourse.id}`).expect(200);
    await authorized('get', `/api/courses/${fixture.otherCourse.id}`, fixture.admin).expect(200);
  });
  it('does not expose another user’s course or its topics by ID', async () => {
    for (const endpoint of [`courses/${fixture.otherCourse.id}`, `courses/${fixture.otherCourse.id}/topics`]) {
      await authorized('get', `/api/${endpoint}`).expect(404);
    }
  });
  it('preserves existing write protections for private and global courses', async () => {
    await authorized('put', `/api/courses/${fixture.otherCourse.id}`).send({ name: 'Changed' }).expect(403);
    await authorized('delete', `/api/courses/${fixture.globalCourse.id}`).expect(403);
    await authorized('post', '/api/topics').send({ name: 'Changed', courseId: fixture.otherCourse.id, estimatedTime: 30, difficulty: 'Kolay' }).expect(403);
  });
});

describe('study session relationships and read safety', () => {
  it('rejects a private course belonging to a different user', async () => {
    await authorized('post', '/api/study-sessions').send(sessionBody({ courseId: fixture.otherCourse.id })).expect(400);
  });
  it('rejects another user’s topic even without a course ID', async () => {
    await authorized('post', '/api/study-sessions').send(sessionBody({ topicId: fixture.otherCourseTopic.id })).expect(400);
  });
  it('rejects topics from a different selected course and inactive courses', async () => {
    await authorized('post', '/api/study-sessions').send(sessionBody({ courseId: fixture.ownCourse.id, topicId: fixture.globalCourseTopic.id })).expect(400);
    await authorized('post', '/api/study-sessions').send(sessionBody({ courseId: fixture.inactiveCourse.id })).expect(400);
  });
  it('rejects invalid numeric relation IDs', async () => {
    for (const courseId of [0, -1, 1.5]) await authorized('post', '/api/study-sessions').send(sessionBody({ courseId })).expect(400);
  });
  it('accepts global resources and resolves a visible topic’s parent course', async () => {
    await authorized('post', '/api/study-sessions').send(sessionBody({ courseId: fixture.globalCourse.id })).expect(201);
    const response = await authorized('post', '/api/study-sessions').send(sessionBody({ topicId: fixture.ownCourseTopic.id, startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' })).expect(201);
    assert.equal(response.body.data.session.courseId, fixture.ownCourse.id);
  });
  it('does not change overdue session status or overwrite notes when listing', async () => {
    const session = await StudySession.create({ userId: fixture.owner.id, title: 'Overdue', startTime: new Date('2020-01-01T09:00:00Z'), endTime: new Date('2020-01-01T10:00:00Z'), duration: 60, status: 'in_progress', sessionType: 'study', notes: 'Preserve this user note' });
    for (let index = 0; index < 2; index++) await authorized('get', '/api/study-sessions').expect(200);
    await session.reload();
    assert.equal(session.status, 'in_progress');
    assert.equal(session.notes, 'Preserve this user note');
  });
});

describe('non-destructive schema lifecycle', () => {
  it('uses only the isolated configured database', () => { assert.equal(databasePath, path.join(directory, 'test.sqlite')); });
  it('backs up the configured database rather than a repository-root file', async () => {
    const { Sequelize, QueryTypes } = require('sequelize');
    const { performBackup } = require('../dist/services/backups');
    const backup = await performBackup('manual');
    assert.equal(path.dirname(backup.path), path.join(directory, 'backups'));
    const snapshot = new Sequelize({ dialect: 'sqlite', storage: backup.path, logging: false });
    try {
      const [row] = await snapshot.query('SELECT COUNT(*) AS count FROM users', { type: QueryTypes.SELECT });
      assert.equal(row.count, await User.count());
    } finally { await snapshot.close(); }
  });
  it('preserves data and unrelated backup tables on connection and migration reruns', async () => {
    await sequelize.query('CREATE TABLE preserved_backup (value TEXT)');
    await sequelize.query("INSERT INTO preserved_backup VALUES ('keep')");
    const count = await User.count();
    await connectDB();
    await applyMigrations();
    await assertDatabaseReady();
    assert.equal(await User.count(), count);
    const [rows] = await sequelize.query('SELECT value FROM preserved_backup');
    assert.deepEqual(rows, [{ value: 'keep' }]);
  });
});
