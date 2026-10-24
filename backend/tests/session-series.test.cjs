const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-series-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
// Monday 2099-01-05, 09:00 in Istanbul (UTC+3), where accounts live by default.
const realNow = Date.now;
let now = Date.parse('2099-01-05T06:00:00Z');
Date.now = () => now;
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, StudySession, SessionSeries } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { extendAllSeries } = require('../dist/services/sessionSeries');

let owner, other;
const auth = (method, url, user = owner) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const routine = (patch = {}) => ({ title: 'Guitar', weekdays: [1, 3], startTime: '19:00', durationMinutes: 60, startsOn: '2099-01-05', ...patch });
const createRoutine = async (patch, user = owner) => (await auth('post', '/api/session-series', user).send(routine(patch)).expect(201)).body.data;
const sessionsOf = (seriesId) => StudySession.findAll({ where: { seriesId }, order: [['startTime', 'ASC']] });
const dates = (sessions) => sessions.map((session) => session.seriesDate);

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
});
beforeEach(async () => {
  now = Date.parse('2099-01-05T06:00:00Z');
  await StudySession.destroy({ where: {} });
  await SessionSeries.destroy({ where: {} });
});
after(async () => { Date.now = realNow; await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('creates a weekly routine as real sessions up to the horizon at its wall time in the owner zone', async () => {
  const { series, skippedDates } = await createRoutine();
  assert.deepEqual(skippedDates, []);
  assert.equal(series.timezone, 'Europe/Istanbul');
  const sessions = await sessionsOf(series.id);
  // 26 weeks of Mondays and Wednesdays, plus the Monday that ends the 182-day horizon.
  assert.equal(sessions.length, 53);
  assert.equal(sessions[0].startTime.toISOString(), '2099-01-05T16:00:00.000Z');
  assert.equal(sessions[0].duration, 60);
  assert.deepEqual(dates(sessions).slice(0, 3), ['2099-01-05', '2099-01-07', '2099-01-12']);
  assert.equal(sessions[0].title, 'Guitar');
  assert.equal((await SessionSeries.findByPk(series.id)).generatedThrough, '2099-07-06');
});

it('stops at the end date, skips times already over, and reports days another session holds', async () => {
  const short = await createRoutine({ endsOn: '2099-01-14' });
  assert.deepEqual(dates(await sessionsOf(short.series.id)), ['2099-01-05', '2099-01-07', '2099-01-12', '2099-01-14']);
  await auth('delete', `/api/session-series/${short.series.id}`).send({ expectedUpdatedAt: short.series.updatedAt }).expect(200);

  // 08:00 today is already over at 09:00, so the routine starts next week; that is not a conflict.
  const early = await createRoutine({ weekdays: [1], startTime: '08:00', endsOn: '2099-01-19' });
  assert.deepEqual(dates(await sessionsOf(early.series.id)), ['2099-01-12', '2099-01-19']);
  assert.deepEqual(early.skippedDates, []);

  await auth('post', '/api/study-sessions').send({ title: 'Dentist', startTime: '2099-01-07T16:30:00Z', endTime: '2099-01-07T17:30:00Z' }).expect(201);
  const busy = await createRoutine({ endsOn: '2099-01-14', title: 'Piano' });
  assert.deepEqual(busy.skippedDates, ['2099-01-07']);
  assert.deepEqual(dates(await sessionsOf(busy.series.id)), ['2099-01-05', '2099-01-12', '2099-01-14']);
});

it('rebuilds only untouched future sessions on edit and never recreates ones changed, started or removed', async () => {
  const { series } = await createRoutine({ endsOn: '2099-01-19' });
  const [monday, wednesday, nextMonday] = await sessionsOf(series.id);
  await auth('put', `/api/study-sessions/${wednesday.id}`).send({ startTime: '2099-01-07T18:00:00Z', endTime: '2099-01-07T19:00:00Z', expectedUpdatedAt: wednesday.updatedAt.toISOString() }).expect(200);
  await auth('delete', `/api/study-sessions/${nextMonday.id}`).send({ expectedUpdatedAt: nextMonday.updatedAt.toISOString() }).expect(200);
  await auth('patch', `/api/study-sessions/${monday.id}/start`).send({ expectedUpdatedAt: monday.updatedAt.toISOString() }).expect(200);
  const stored = await SessionSeries.findByPk(series.id);
  assert.deepEqual([...stored.exceptionDates].sort(), ['2099-01-07', '2099-01-12']);
  // A one-off change bumps the routine's version, so a stale edit is refused.
  await auth('put', `/api/session-series/${series.id}`).send({ ...routine({ endsOn: '2099-01-19', startTime: '20:00' }), expectedUpdatedAt: series.updatedAt }).expect(409);

  const edited = await auth('put', `/api/session-series/${series.id}`).send({ ...routine({ endsOn: '2099-01-19', startTime: '20:00', title: 'Guitar practice' }), expectedUpdatedAt: stored.updatedAt.toISOString() }).expect(200);
  assert.equal(edited.body.data.series.startTime, '20:00');
  const after = await sessionsOf(series.id);
  assert.deepEqual(after.map((session) => [session.seriesDate, session.startTime.toISOString(), session.title, session.status]), [
    ['2099-01-05', '2099-01-05T16:00:00.000Z', 'Guitar', 'in_progress'],
    ['2099-01-07', '2099-01-07T18:00:00.000Z', 'Guitar', 'planned'],
    ['2099-01-14', '2099-01-14T17:00:00.000Z', 'Guitar practice', 'planned'],
    ['2099-01-19', '2099-01-19T17:00:00.000Z', 'Guitar practice', 'planned'],
  ]);
});

it('ends a routine by removing its untouched future sessions and keeping the rest as ordinary sessions', async () => {
  const { series } = await createRoutine({ endsOn: '2099-01-14' });
  const [, wednesday] = await sessionsOf(series.id);
  await auth('put', `/api/study-sessions/${wednesday.id}`).send({ notes: 'Bring the capo', expectedUpdatedAt: wednesday.updatedAt.toISOString() }).expect(200);
  const current = await SessionSeries.findByPk(series.id);
  await auth('delete', `/api/session-series/${series.id}`).send({ expectedUpdatedAt: current.updatedAt.toISOString() }).expect(200);
  assert.equal(await SessionSeries.count(), 0);
  const left = await StudySession.findAll();
  assert.deepEqual(left.map((session) => [session.notes, session.seriesId, session.seriesDate]), [['Bring the capo', null, null]]);
});

it('moves the horizon forward each day without changing the routine version', async () => {
  const { series } = await createRoutine({ weekdays: [1] });
  const before = await SessionSeries.findByPk(series.id);
  now += 7 * 86_400_000;
  assert.equal(await extendAllSeries(), 0);
  const extended = await SessionSeries.findByPk(series.id);
  assert.equal(extended.generatedThrough, '2099-07-13');
  assert.equal(extended.updatedAt.getTime(), before.updatedAt.getTime());
  const all = dates(await sessionsOf(series.id));
  assert.equal(all.at(-1), '2099-07-13');
  assert.equal(new Set(all).size, all.length);
  // Running again on the same day adds nothing.
  await extendAllSeries();
  assert.equal((await sessionsOf(series.id)).length, all.length);
});

it('keeps routines private to their owner and validates the definition', async () => {
  const { series } = await createRoutine();
  assert.deepEqual((await auth('get', '/api/session-series', other).expect(200)).body.data.series, []);
  assert.equal((await auth('get', '/api/session-series').expect(200)).body.data.series[0].id, series.id);
  await auth('put', `/api/session-series/${series.id}`, other).send({ ...routine(), expectedUpdatedAt: series.updatedAt }).expect(404);
  await auth('delete', `/api/session-series/${series.id}`, other).send({ expectedUpdatedAt: series.updatedAt }).expect(404);
  for (const patch of [{ weekdays: [] }, { weekdays: [1, 1] }, { weekdays: [7] }, { startTime: '24:00' }, { durationMinutes: 0 }, { endsOn: '2099-01-04' }, { courseId: 999 }]) {
    await auth('post', '/api/session-series').send(routine(patch)).expect(400);
  }
  const exported = (await auth('get', '/api/auth/account/export').expect(200)).body;
  assert.equal(exported.routines.length, 1);
  assert.equal(exported.sessions.filter((session) => session.seriesId === series.id).length, 53);
});
