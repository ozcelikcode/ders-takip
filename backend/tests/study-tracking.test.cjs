const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-activity-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations, assertDatabaseReady } = require('../dist/database/migrations');
const { User, StudySession, SessionInterval, Plan, Category, Course } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');
let owner, other, admin;
const auth = (method, url, user = owner) => request(app)[method](url).auth(generateAccessToken({ id: String(user.id), sid: user.sessionId }), { type: 'bearer' }).set('X-Requested-With', 'StudyTracker');
const create = async (extra = {}) => (await auth('post', '/api/study-sessions').send({ title: 'Activity fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T10:00:00Z', ...extra }).expect(201)).body.data.session;
const action = async (session, name, data = {}) => (await auth('patch', `/api/study-sessions/${session.id}/${name}`).send({ expectedUpdatedAt: session.updatedAt, ...data }).expect(200)).body.data.session;
const stats = async (query = '') => (await auth('get', `/api/study-sessions/stats${query}`).expect(200)).body.data.stats;
before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other', 'admin']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: name === 'admin' ? 'admin' : 'student' });
    user.sessionId = (await createAuthSession(user)).session.id;
    if (name === 'owner') owner = user; else if (name === 'other') other = user; else admin = user;
  }
});
beforeEach(async () => { await StudySession.destroy({ where: {} }); await Plan.destroy({ where: {} }); });
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('measures 5 minutes study, 3 minutes pause, 5 minutes study without crediting the 60-minute plan', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create(); session = await action(session, 'start');
  now += 300000; session = await action(session, 'pause');
  now += 180000; session = await action(session, 'start');
  now += 300000; session = await action(session, 'complete');
  assert.equal(session.duration, 60); assert.equal(session.studySeconds, 600); assert.equal(session.pauseSeconds, 180); assert.equal(session.breakSeconds, 0);
  const repeated = await action(session, 'complete');
  assert.equal(repeated.completedAt, session.completedAt); assert.equal(repeated.studySeconds, 600); assert.equal(repeated.updatedAt, session.updatedAt);
  assert.equal((await stats()).studySeconds, 600);
});
it('measures explicit untimed activity phases and advances the version on phase-only updates', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create({ sessionType: 'study' }); session = await action(session, 'start');
  now += 60000;
  const changed = await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, activityKind: 'break' }).expect(200);
  const before = session; session = changed.body.data.session; assert.notEqual(session.updatedAt, before.updatedAt);
  await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: before.updatedAt, activityKind: 'study' }).expect(409);
  now += 120000; session = await action(session, 'pause');
  now += 30000; session = await action(session, 'start', { activityKind: 'study' });
  now += 60000; session = await action(session, 'complete');
  assert.equal(session.studySeconds, 120); assert.equal(session.breakSeconds, 120); assert.equal(session.pauseSeconds, 30);
});
it('never counts a dedicated break session as study and direct completion credits zero work', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create({ sessionType: 'break' }); session = await action(session, 'start');
  now += 60000; session = await action(session, 'complete'); assert.equal(session.studySeconds, 0); assert.equal(session.breakSeconds, 60);
  const untouched = await create({ startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' });
  assert.equal((await action(untouched, 'complete')).studySeconds, 0);
});
it('keeps measured history after reopening, cancellation and rescheduling', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create(); session = await action(session, 'start'); now += 60000; session = await action(session, 'complete');
  session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, status: 'planned', startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' }).expect(200)).body.data.session;
  assert.equal(session.studySeconds, 60); assert.equal(session.completedAt, null);
  session = await action(session, 'start'); now += 30000;
  session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, status: 'cancelled' }).expect(200)).body.data.session;
  now += 60000; assert.equal((await stats()).studySeconds, 90); assert.equal(session.studySeconds, 90);
});
it('splits actual intervals at local midnight independently of planned dates', async t => {
  let now = Date.parse('2026-10-16T20:55:00Z'); t.mock.method(Date, 'now', () => now);
  let session = await create(); session = await action(session, 'start'); now += 600000; await action(session, 'complete');
  const summary = await stats('?startDate=2026-10-16&endDate=2026-10-17&timezone=Europe%2FIstanbul');
  assert.deepEqual(summary.days.map(day => day.studySeconds), [300, 300]); assert.equal(summary.studySeconds, 600);
  const utc = await stats('?startDate=2026-10-16&endDate=2026-10-16&timezone=UTC'); assert.equal(utc.studySeconds, 600);
});
it('reads active totals without writing status, version or interval endpoints', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create(); session = await action(session, 'start'); now += 10000;
  for (let i = 0; i < 2; i++) { const read = await auth('get', `/api/study-sessions/${session.id}`).expect(200); assert.equal(read.body.data.session.studySeconds, 10); assert.equal(read.body.data.session.updatedAt, session.updatedAt); }
  assert.equal((await SessionInterval.findOne({ where: { sessionId: session.id } })).endedAt, null);
});
it('uses half-open schedule intersections and profile timezone including single-bound queries', async () => {
  await StudySession.create({ userId: owner.id, title: 'Crossing midnight', startTime: new Date('2026-10-15T20:30:00Z'), endTime: new Date('2026-10-15T21:30:00Z'), duration: 60, sessionType: 'study' });
  const read = await auth('get', '/api/study-sessions?startDate=2026-10-16&endDate=2026-10-16').expect(200); assert.equal(read.body.data.sessions.length, 1);
  const utc = await auth('get', '/api/study-sessions?startDate=2026-10-16&endDate=2026-10-16&timezone=UTC').expect(200); assert.equal(utc.body.data.sessions.length, 0);
  await auth('get', '/api/study-sessions?startDate=2026-10-16').expect(200);
  for (const query of ['startDate=2026-02-30','timezone=Invalid','startDate=2026-10-17&endDate=2026-10-16','startDate=2026-10-16T00:00:00Z']) await auth('get', `/api/study-sessions?${query}`).expect(400);
});
it('rejects ambiguous input and unreasonable statistics ranges', async () => {
  for (const query of ['startDate=2026-10-16','startDate=2020-01-01&endDate=2026-01-01','startDate=2011-12-30&endDate=2011-12-30&timezone=Pacific%2FApia']) await auth('get', `/api/study-sessions/stats?${query}`).expect(400);
});
it('isolates user stats and fixes plan totals without adding unfinished plan duration', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  const plan = await Plan.create({ userId: owner.id, title: 'Plan', startDate: new Date('2026-10-16T00:00:00Z'), endDate: new Date('2026-10-16T23:00:00Z'), goals: { dailyHours: 2, weeklyHours: 14, targetTopics: 1, priority: 'medium' } });
  let session = await create({ planId: plan.id }); session = await action(session, 'start'); now += 60000; await action(session, 'complete');
  await create({ planId: plan.id, startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' });
  const planStats = await auth('get', `/api/plans/${plan.id}/stats`).expect(200); assert.equal(planStats.body.data.stats.totalStudyHours, 1 / 60);
  await auth('get', `/api/users/${owner.id}/stats`, other).expect(404);
  const own = await auth('get', `/api/users/${owner.id}/stats`, admin).expect(200); assert.equal(own.body.data.stats.studySeconds, 60);
  const foreign = await auth('get', '/api/study-sessions/stats', other).expect(200); assert.equal(foreign.body.data.stats.studySeconds, 0);
});
it('serves global admin overview and bulk user summaries without per-user requests', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  let session = await create(); session = await action(session, 'start'); now += 120000; await action(session, 'complete');
  await create({ startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' });
  let foreign = await auth('post', '/api/study-sessions', other).send({ title: 'Other fixture', startTime: '2099-01-03T09:00:00Z', endTime: '2099-01-03T10:00:00Z' }).expect(201);
  foreign = foreign.body.data.session; foreign = (await auth('patch', `/api/study-sessions/${foreign.id}/start`, other).send({ expectedUpdatedAt: foreign.updatedAt }).expect(200)).body.data.session; now += 60000; await auth('patch', `/api/study-sessions/${foreign.id}/complete`, other).send({ expectedUpdatedAt: foreign.updatedAt }).expect(200);
  await auth('get', '/api/users/admin-stats', other).expect(403);
  const { overview } = (await auth('get', '/api/users/admin-stats', admin).expect(200)).body.data;
  assert.equal(overview.users.total, 3); assert.equal(overview.sessions.totalSessions, 3); assert.equal(overview.sessions.completedSessions, 2); assert.equal(overview.sessions.studySeconds, 180);
  assert.equal(overview.recentSessions.length, 3); assert.equal(overview.recentSessions[0].userName, 'Test User');
  const { users } = (await auth('get', '/api/users?includeStats=true', admin).expect(200)).body.data;
  const byName = Object.fromEntries(users.map(user => [user.username, user.stats]));
  assert.deepEqual([byName.owner.totalSessions, byName.owner.completedSessions, byName.owner.studySeconds], [2, 1, 120]);
  assert.deepEqual([byName.other.totalSessions, byName.other.studySeconds], [1, 60]); assert.equal(byName.admin.totalSessions, 0);
  assert.equal((await auth('get', '/api/users', admin).expect(200)).body.data.users[0].stats, undefined);
});
it('rolls back interval closure when the session write fails and enforces one open interval', async () => {
  let session = await create(); session = await action(session, 'start');
  await assert.rejects(SessionInterval.create({ sessionId: session.id, kind: 'study', startedAt: new Date() }));
  StudySession.addHook('afterUpdate', 'tracking-failure', () => { throw new Error('Failure fixture'); });
  try { await auth('patch', `/api/study-sessions/${session.id}/complete`).send({ expectedUpdatedAt: session.updatedAt }).expect(500); }
  finally { StudySession.removeHook('afterUpdate', 'tracking-failure'); }
  assert.equal((await SessionInterval.findOne({ where: { sessionId: session.id } })).endedAt, null);
  assert.equal((await StudySession.findByPk(session.id)).status, 'in_progress');
});
it('migrates existing data without inventing measurements and preserves the original duration', async () => {
  let session = await create(); session = await action(session, 'complete');
  await sequelize.query('DROP TABLE session_intervals');
  await sequelize.query('ALTER TABLE study_sessions DROP COLUMN trackingCoverage');
  await sequelize.query("DELETE FROM schema_migrations WHERE name='004-session-activity-intervals'");
  const originalSync = SessionInterval.sync;
  SessionInterval.sync = async () => { throw new Error('Migration fixture'); };
  try { await assert.rejects(applyMigrations()); }
  finally { SessionInterval.sync = originalSync; }
  assert.equal((await sequelize.getQueryInterface().describeTable('study_sessions')).trackingCoverage, undefined);
  await applyMigrations(); await assertDatabaseReady(); await applyMigrations();
  const saved = (await auth('get', `/api/study-sessions/${session.id}`).expect(200)).body.data.session;
  assert.equal(saved.duration, 60); assert.equal(saved.trackingCoverage, 'untracked'); assert.equal(saved.studySeconds, 0);
  assert.equal((await stats()).untrackedSessions, 1);
  let reopened = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: saved.updatedAt, status: 'planned' }).expect(200)).body.data.session;
  reopened = await action(reopened, 'start'); assert.equal(reopened.trackingCoverage, 'partial');
});

it('breaks measured study down per course, largest first, with unassigned sessions grouped as null', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  const category = await Category.create({ name: 'Breakdown category', color: '#123456', icon: 'Book', order: 1 });
  const course = await Course.create({ name: 'Breakdown course', categoryId: category.id, userId: owner.id, color: '#123456', icon: 'Book', order: 1 });
  const timed = async (extra, seconds, slot) => {
    let session = await create({ startTime: `2099-01-0${slot}T09:00:00Z`, endTime: `2099-01-0${slot}T10:00:00Z`, ...extra });
    session = await action(session, 'start'); now += seconds * 1000; await action(session, 'complete');
  };
  await timed({ courseId: course.id }, 120, 1);
  await timed({ courseId: course.id }, 60, 2);
  await timed({}, 300, 3);
  await create({ courseId: course.id, startTime: '2099-01-04T09:00:00Z', endTime: '2099-01-04T10:00:00Z' });
  assert.deepEqual((await stats()).courses, [
    { courseId: null, studySeconds: 300, sessions: 1 },
    { courseId: course.id, studySeconds: 180, sessions: 2 },
  ]);
  await Course.destroy({ where: { id: course.id } }); await category.destroy();
});
