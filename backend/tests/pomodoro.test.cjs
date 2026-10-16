const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const request = require('supertest');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'study-tracker-pomodoro-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations, assertDatabaseReady } = require('../dist/database/migrations');
const { User, StudySession, SessionInterval, PomodoroClock } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { runDuePomodoros } = require('../dist/services/pomodoroClocks');
const { withDatabaseActivity, withDatabaseMaintenance } = require('../dist/services/databaseMaintenance');
let owner, other;
const auth = (method, url, user = owner) => request(app)[method](url).auth(user.token, { type: 'bearer' }).set('X-Requested-With', 'StudyTracker');
const settings = { workDuration: 1, shortBreak: 1, longBreak: 2, cyclesBeforeLongBreak: 2, currentCycle: 0 };
const create = async (extra = {}) => (await auth('post', '/api/study-sessions').send({ title: 'Pomodoro fixture', startTime: '2099-01-01T09:00:00Z', endTime: '2099-01-01T12:00:00Z', sessionType: 'pomodoro', pomodoroSettings: settings, ...extra }).expect(201)).body.data.session;
const command = async (session, command, extra = {}, status = 200, user = owner) => (await auth('post', `/api/study-sessions/${session.id}/pomodoro`, user).send({ expectedUpdatedAt: session.updatedAt, command, ...extra }).expect(status)).body.data?.session;
const read = async session => (await auth('get', `/api/study-sessions/${session.id}`).expect(200)).body.data.session;
const totals = async () => (await auth('get', '/api/study-sessions/stats').expect(200)).body.data.stats;
const rows = async table => (await sequelize.query(`SELECT * FROM ${table} ORDER BY rowid`))[0];
before(async () => {
 await applyMigrations();
 for (const name of ['owner', 'other']) {
  const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User' });
  user.token = (await createAuthSession(user)).tokens.accessToken; if (name === 'owner') owner = user; else other = user;
 }
});
beforeEach(async () => { await StudySession.destroy({ where: {} }); });
after(async () => { await sequelize.close(); fs.rmSync(directory, { recursive: true, force: true }); });

it('persists deadlines and fractional remaining time across reads, pause and resume', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume');
 assert.equal(Date.parse(session.pomodoroClock.deadlineAt), now + 60000);
 now += 10500; session = await read(session); assert.equal(session.studySeconds, 10.5);
 session = await command(session, 'pause'); assert.equal(session.pomodoroClock.remainingMilliseconds, 49500); assert.equal(session.pomodoroClock.deadlineAt, null);
 now += 90000; session = await command(await read(session), 'resume');
 assert.equal(Date.parse(session.pomodoroClock.deadlineAt), now + 49500);
 now += 5000; session = await command(session, 'complete'); assert.equal(session.studySeconds, 15.5); assert.equal(session.pauseSeconds, 90);
});
it('closes at the persisted deadline despite a late scheduler and keeps GET strictly read-only', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume'); now += 180000;
 const before = await rows('session_intervals'); const clocks = await rows('pomodoro_clocks');
 const observed = await read(session); assert.equal(observed.studySeconds, 60); assert.equal((await totals()).studySeconds, 60);
 assert.deepEqual(await rows('session_intervals'), before); assert.deepEqual(await rows('pomodoro_clocks'), clocks);
 assert.equal(observed.updatedAt, session.updatedAt);
 assert.equal(await runDuePomodoros(), 1); session = await read(session);
 assert.equal(session.status, 'paused'); assert.equal(session.pomodoroClock.phase, 'short_break');
 assert.equal(session.studySeconds, 60); assert.equal(session.pauseSeconds, 120); assert.equal(session.pomodoroClock.completedWorkCycles, 1);
 assert.equal(await runDuePomodoros(), 0);
});
it('starts only an opted-in break and never invents more work during long suspension or restart catch-up', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'configure', { autoStartBreaks: true }); session = await command(session, 'resume');
 now += 600000;
 const results = await Promise.all([runDuePomodoros(), runDuePomodoros()]); assert.equal(results.reduce((a, b) => a + b, 0), 1);
 session = await read(session);
 assert.equal(session.status, 'paused'); assert.equal(session.pomodoroClock.phase, 'work'); assert.equal(session.pomodoroClock.cycle, 2);
 assert.equal(session.studySeconds, 60); assert.equal(session.breakSeconds, 60); assert.equal(session.pauseSeconds, 480);
 assert.deepEqual(session.activityIntervals.map(interval => interval.kind), ['study', 'break', 'pause']);
});
it('keeps short/long break phase, cycle and completed-work count through a full cycle', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume');
 for (const expected of ['short_break', 'work', 'long_break', 'work']) {
  const elapsed = session.pomodoroClock.phase === 'long_break' ? 120000 : 60000;
  now += elapsed; await runDuePomodoros(); session = await read(session);
  assert.equal(session.pomodoroClock.phase, expected); assert.equal(session.status, 'paused');
  if (expected !== 'work' || session.pomodoroClock.completedWorkCycles < 2) session = await command(session, 'resume');
 }
 assert.equal(session.pomodoroClock.cycle, 1); assert.equal(session.pomodoroClock.completedWorkCycles, 2);
 assert.equal(session.studySeconds, 120); assert.equal(session.breakSeconds, 180);
});
it('serializes cross-tab commands and refuses a stale completion after a phase transition', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 const session = await create();
 const results = await Promise.all(['resume', 'resume'].map(name => auth('post', `/api/study-sessions/${session.id}/pomodoro`).send({ expectedUpdatedAt: session.updatedAt, command: name })));
 assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
 const running = results.find(result => result.status === 200).body.data.session;
 now += 60000; await runDuePomodoros();
 await command(running, 'complete', {}, 409);
 assert.equal(await SessionInterval.count({ where: { sessionId: session.id, kind: 'study' } }), 1);
 assert.equal((await read(session)).pomodoroClock.completedWorkCycles, 1);
});
it('settles an overdue phase inside a manual write before completing and preserves user notes', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await create(); session = await command(session, 'resume'); now += 90000;
 session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, status: 'completed', notes: 'User notes' }).expect(200)).body.data.session;
 assert.equal(session.studySeconds, 60); assert.equal(session.pauseSeconds, 30); assert.equal(session.notes, 'User notes'); assert.equal(session.pomodoroClock.deadlineAt, null);
 const repeated = await command(session, 'complete'); assert.equal(repeated.updatedAt, session.updatedAt); assert.equal(repeated.completedAt, session.completedAt);
});
it('shares start/pause/reopen behavior with generic planner endpoints and retains measurement after reset', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await create();
 session = (await auth('patch', `/api/study-sessions/${session.id}/start`).send({ expectedUpdatedAt: session.updatedAt }).expect(200)).body.data.session;
 assert.ok(session.pomodoroClock.deadlineAt); now += 15000;
 session = (await auth('patch', `/api/study-sessions/${session.id}/pause`).send({ expectedUpdatedAt: session.updatedAt }).expect(200)).body.data.session;
 assert.equal(session.pomodoroClock.remainingMilliseconds, 45000);
 session = await command(session, 'reset'); assert.equal(session.studySeconds, 15); assert.equal(session.pomodoroClock.remainingMilliseconds, 60000);
 session = await command(session, 'resume'); now += 5000; session = await command(session, 'complete'); assert.equal(session.studySeconds, 20);
});
it('does not extend a deadline on redundant resume or unrelated metadata writes', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume'); const deadline = session.pomodoroClock.deadlineAt; const version = session.updatedAt;
 now += 10000; session = await command(session, 'resume'); assert.equal(session.pomodoroClock.deadlineAt, deadline); assert.equal(session.updatedAt, version);
 session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, notes: 'Preserved' }).expect(200)).body.data.session;
 assert.equal(session.pomodoroClock.deadlineAt, deadline);
});
it('rejects manual phase forgery, deadline/counter writes and live duration changes', async () => {
 const session = await command(await create(), 'resume');
 await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, activityKind: 'break' }).expect(409);
 await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, pomodoroSettings: { workDuration: 2 } }).expect(409);
 for (const patch of [{ command: 'advance' }, { command: 'pause', remainingMilliseconds: 10 }, { command: 'pause', autoStartBreaks: false }, { command: 'configure' }, { command: 'configure', autoStartBreaks: 'true' }]) {
  await auth('post', `/api/study-sessions/${session.id}/pomodoro`).send({ expectedUpdatedAt: session.updatedAt, ...patch }).expect(400);
 }
 assert.equal((await read(session)).updatedAt, session.updatedAt);
});
it('keeps timer and measured intervals atomic on scheduler and command failure', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume');
 for (const operation of [() => command(session, 'pause', {}, 500), async () => { now += 60000; await assert.rejects(runDuePomodoros()); }]) {
  const beforeIntervals = await rows('session_intervals'); const beforeClocks = await rows('pomodoro_clocks'); const beforeSessions = await rows('study_sessions');
  StudySession.addHook('afterUpdate', 'failure', () => { throw new Error('Private timer failure'); });
  try { await operation(); } finally { StudySession.removeHook('afterUpdate', 'failure'); }
  assert.deepEqual(await rows('session_intervals'), beforeIntervals); assert.deepEqual(await rows('pomodoro_clocks'), beforeClocks); assert.deepEqual(await rows('study_sessions'), beforeSessions);
 }
});
it('isolates users, denies non-Pomodoro clocks and preserves the one-active-session rule', async () => {
 const session = await create(); await command(session, 'resume', {}, 404, other);
 const running = await command(session, 'resume');
 const second = await create({ startTime: '2099-01-02T09:00:00Z', endTime: '2099-01-02T10:00:00Z' }); await command(second, 'resume', {}, 409);
 const untimed = await create({ sessionType: 'study', startTime: '2099-01-03T09:00:00Z', endTime: '2099-01-03T10:00:00Z' }); await command(untimed, 'resume', {}, 409);
 await command(running, 'pause'); await command(second, 'resume');
});
it('never increases paused remaining time after a server clock rollback', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume'); now -= 300000;
 session = await command(session, 'pause'); assert.equal(session.pomodoroClock.remainingMilliseconds, 60000); assert.equal(session.studySeconds, 0);
});
it('adds clock storage idempotently without inventing legacy timer state and rolls migration failure back', async () => {
 const session = await create(); const before = await rows('study_sessions');
 await sequelize.query('DROP TABLE pomodoro_clocks'); await sequelize.query("DELETE FROM schema_migrations WHERE name='005-pomodoro-clocks'");
 const original = PomodoroClock.sync; PomodoroClock.sync = async () => { throw new Error('Clock migration failure'); };
 try { await assert.rejects(applyMigrations()); } finally { PomodoroClock.sync = original; }
 await assert.rejects(assertDatabaseReady()); assert.deepEqual(await rows('study_sessions'), before);
 await applyMigrations(); await applyMigrations(); assert.equal(await PomodoroClock.count(), 0);
 assert.equal((await read(session)).pomodoroClock, null); assert.deepEqual(await rows('study_sessions'), before);
});
it('waits for a background writer before maintenance and skips clock work while maintenance owns the database', async () => {
 let release; const waiting = new Promise(resolve => { release = resolve; });
 const activity = withDatabaseActivity(() => waiting); let maintenanceStarted = false;
 const maintenance = withDatabaseMaintenance(async () => { maintenanceStarted = true; assert.equal(await runDuePomodoros(), undefined); });
 await Promise.resolve(); assert.equal(maintenanceStarted, false); release(); await activity; await maintenance; assert.equal(maintenanceStarted, true);
});
it('starts a converted session with the newly supplied Pomodoro settings', async () => {
 let session = await create({ sessionType: 'study' });
 session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, sessionType: 'pomodoro', status: 'in_progress', pomodoroSettings: { workDuration: 3 } }).expect(200)).body.data.session;
 assert.equal(session.pomodoroClock.remainingMilliseconds, 180000);
});
it('keeps legacy running sessions unmodified on GET and begins an acknowledged clock only on activation', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 const session = await StudySession.create({ userId: owner.id, title: 'Legacy running', startTime: new Date('2099-01-01T09:00:00Z'), endTime: new Date('2099-01-01T10:00:00Z'), duration: 60, sessionType: 'pomodoro', status: 'in_progress', pomodoroSettings: settings });
 await SessionInterval.create({ sessionId: session.id, kind: 'study', startedAt: new Date(now - 10000) });
 const observed = await read(session); assert.equal(observed.pomodoroClock, null); assert.equal(observed.studySeconds, 10);
 const activated = await command(observed, 'resume'); assert.equal(activated.studySeconds, 10); assert.equal(Date.parse(activated.pomodoroClock.deadlineAt), now + 60000);
});
it('changes durations only after reset and cascades clock storage on session deletion', async t => {
 let now = Date.now(); t.mock.method(Date, 'now', () => now);
 let session = await command(await create(), 'resume'); now += 10000; session = await command(session, 'reset');
 session = (await auth('put', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt, pomodoroSettings: { workDuration: 2 } }).expect(200)).body.data.session;
 assert.equal(session.pomodoroClock.remainingMilliseconds, 120000); assert.equal(session.studySeconds, 10);
 await auth('delete', `/api/study-sessions/${session.id}`).send({ expectedUpdatedAt: session.updatedAt }).expect(200);
 assert.equal(await PomodoroClock.count(), 0); assert.equal(await SessionInterval.count(), 0);
});
