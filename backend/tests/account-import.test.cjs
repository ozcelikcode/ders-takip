const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-import-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { Category, Course, CourseGoal, CourseTag, Plan, SessionInterval, SessionSeries, SessionTag, StudySession, Tag, Topic, User, UserTopicProgress } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const call = (method, url, user, body) => {
  const operation = request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
  return body === undefined ? operation : operation.send(body);
};
const account = async (name, preferences) => {
  const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', ...(preferences ? { preferences } : {}) });
  user.token = (await createAuthSession(user)).tokens.accessToken;
  return user;
};
const at = (day, hour, minute = 0) => new Date(Date.UTC(2026, 9, day, hour, minute));
let source, file, shared;

before(async () => {
  await applyMigrations();
  const common = await Category.create({ name: 'Ortak', color: '#222222', order: 1, userId: null });
  const math = await Course.create({ name: 'Matematik', categoryId: common.id, isGlobal: true, color: '#222222', order: 1 });
  const physics = await Course.create({ name: 'Fizik', categoryId: common.id, isGlobal: true, color: '#333333', order: 2 });
  const derivative = await Topic.create({ name: 'Türev', courseId: math.id, estimatedTime: 45, difficulty: 'Zor', order: 1 });
  shared = { common, math, physics, derivative };

  source = await account('source');
  source.preferences = { ...source.preferences, timezone: 'Europe/Berlin', dailyStudyGoal: 3, onboarding: 'done' };
  await source.save();
  const own = await Category.create({ name: 'Kendi', color: '#111111', order: 2, userId: source.id });
  const guitar = await Course.create({ name: 'Gitar', categoryId: own.id, userId: source.id, color: '#111111', order: 1 });
  const chords = await Topic.create({ name: 'Akorlar', courseId: guitar.id, estimatedTime: 30, difficulty: 'Kolay', order: 1 });
  // A personal record filed under a shared category.
  await Course.create({ name: 'Okuma', categoryId: common.id, userId: source.id, color: '#444444', order: 3 });
  const plan = await Plan.create({ userId: source.id, title: 'Ekim planı', startDate: '2026-10-01', endDate: '2026-10-31' });

  const measured = await StudySession.create({ userId: source.id, title: 'Türev çalış', courseId: math.id, topicId: derivative.id, startTime: at(12, 9), endTime: at(12, 10), duration: 60, status: 'completed', completedAt: at(12, 10), planId: plan.id });
  await SessionInterval.create({ sessionId: measured.id, kind: 'study', startedAt: at(12, 9), endedAt: at(12, 9, 50) });
  await SessionInterval.create({ sessionId: measured.id, kind: 'break', startedAt: at(12, 9, 50), endedAt: at(12, 10) });
  const planned = await StudySession.create({ userId: source.id, title: 'Fizik tekrar', courseId: physics.id, startTime: at(13, 9), endTime: at(13, 10), duration: 60 });
  const running = await StudySession.create({ userId: source.id, title: 'Akor çalış', courseId: guitar.id, topicId: chords.id, startTime: new Date(Date.now() - 10 * 60_000), endTime: new Date(Date.now() + 50 * 60_000), duration: 60, status: 'in_progress' });
  await SessionInterval.create({ sessionId: running.id, kind: 'study', startedAt: new Date(Date.now() - 10 * 60_000), endedAt: null });

  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);
  await call('post', '/api/session-series', source, { title: 'Sabah gitar', courseId: guitar.id, weekdays: [0, 1, 2, 3, 4, 5, 6], startTime: '06:00', durationMinutes: 30, startsOn: today, endsOn: week }).expect(201);

  await CourseGoal.create({ userId: source.id, courseId: math.id, weeklyMinutes: 120 });
  await UserTopicProgress.create({ userId: source.id, topicId: derivative.id, status: 'completed' });
  const exam = await Tag.create({ userId: source.id, name: 'Sınav', nameKey: 'sinav' });
  await CourseTag.create({ tagId: exam.id, courseId: math.id });
  await SessionTag.create({ tagId: exam.id, sessionId: planned.id });

  file = (await call('get', '/api/auth/account/export', source).expect(200)).body;
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

const sessionsOf = (user) => StudySession.findAll({ where: { userId: user.id }, include: [{ model: SessionInterval, as: 'activityIntervals' }], order: [['startTime', 'ASC'], ['id', 'ASC']] });

it('refuses an account that already has data, an older export and anything that is not a valid export', async () => {
  assert.equal((await call('post', '/api/auth/account/import', source, file).expect(409)).body.error.code, 'accountNotEmpty');
  const empty = await account('empty');
  assert.equal((await call('post', '/api/auth/account/import', empty, { ...file, version: 1 }).expect(400)).body.error.code, 'importOutdated');
  const broken = { ...file, sessions: [{ ...file.sessions[0], endTime: file.sessions[0].startTime }] };
  for (const body of [{}, { ...file, format: 'other' }, broken, { ...file, tags: null }]) {
    assert.equal((await call('post', '/api/auth/account/import', empty, body).expect(400)).body.error.code, 'importInvalid');
  }
  assert.equal(await StudySession.count({ where: { userId: empty.id } }), 0);
  await request(app).post('/api/auth/account/import').set('X-Requested-With', 'StudyTracker').send(file).expect(401);
});

it('fills an empty account on this site: shared records by name, its own records anew, measured time kept', async () => {
  const target = await account('target', { ...source.preferences, timezone: 'Europe/Istanbul', onboarding: 'pending' });
  const response = await call('post', '/api/auth/account/import', target, file).expect(200);
  const { result, user } = response.body.data;
  assert.deepEqual(result, {
    created: { categories: 1, courses: 2, topics: 1, plans: 1, routines: 1, sessions: file.sessions.length, tags: 1, courseGoals: 1, topicProgress: 1 },
    matchedShared: 2,
    unlinked: 0,
    preferences: 'imported',
  });
  assert.equal(user.preferences.timezone, 'Europe/Berlin');
  assert.equal(user.preferences.onboarding, 'done');

  const guitar = await Course.findOne({ where: { userId: target.id, name: 'Gitar' }, include: [{ model: Category, as: 'category' }] });
  assert.deepEqual([guitar.category.name, guitar.category.userId, guitar.isGlobal], ['Kendi', target.id, false]);
  const reading = await Course.findOne({ where: { userId: target.id, name: 'Okuma' } });
  assert.equal(reading.categoryId, shared.common.id);

  const sessions = await sessionsOf(target);
  const byTitle = Object.fromEntries(sessions.map((session) => [session.title, session]));
  const measured = byTitle['Türev çalış'];
  assert.deepEqual([measured.courseId, measured.topicId, measured.status], [shared.math.id, shared.derivative.id, 'completed']);
  assert.equal(measured.planId, (await Plan.findOne({ where: { userId: target.id } })).id);
  assert.deepEqual(measured.activityIntervals.map((interval) => [interval.kind, interval.endedAt - interval.startedAt]), [['study', 50 * 60_000], ['break', 10 * 60_000]]);
  assert.equal(byTitle['Fizik tekrar'].courseId, shared.physics.id);

  // The running session comes back paused from the export moment, so it does not keep counting across the move.
  const running = byTitle['Akor çalış'];
  assert.equal(running.status, 'paused');
  const [study, pause] = running.activityIntervals;
  assert.equal(study.endedAt.toISOString(), file.exportedAt);
  assert.deepEqual([pause.kind, pause.startedAt.toISOString(), pause.endedAt], ['pause', file.exportedAt, null]);
  assert.equal(running.courseId, guitar.id);

  const routine = await SessionSeries.findOne({ where: { userId: target.id } });
  assert.equal(routine.courseId, guitar.id);
  const routineSessions = sessions.filter((session) => session.seriesId === routine.id);
  assert.equal(routineSessions.length, file.sessions.filter((session) => session.seriesId).length);
  assert.ok(routineSessions.every((session) => session.seriesDate));

  assert.deepEqual((await CourseGoal.findAll({ where: { userId: target.id } })).map((goal) => [goal.courseId, goal.weeklyMinutes]), [[shared.math.id, 120]]);
  assert.deepEqual((await UserTopicProgress.findAll({ where: { userId: target.id } })).map((row) => [row.topicId, row.status]), [[shared.derivative.id, 'completed']]);
  const tags = (await call('get', '/api/tags', target).expect(200)).body.data;
  assert.deepEqual(tags.tags.map((tag) => tag.name), ['Sınav']);
  assert.deepEqual(tags.courseTags.map((row) => row.courseId), [shared.math.id]);
  assert.deepEqual(tags.sessionTags.map((row) => row.sessionId), [byTitle['Fizik tekrar'].id]);

  // Nothing of the source account changed, and a second import is refused.
  assert.equal(await StudySession.count({ where: { userId: source.id } }), file.sessions.length);
  assert.equal((await call('post', '/api/auth/account/import', target, file).expect(409)).body.error.code, 'accountNotEmpty');
});

it('turns a shared record this site does not have into the person\'s own record, sub-records included', async () => {
  const target = await account('elsewhere');
  const rename = (row) => (row.id === shared.math.id ? { ...row, name: 'Analiz' } : row);
  const elsewhere = { ...file, references: { ...file.references, courses: file.references.courses.map(rename) }, account: { preferences: { broken: true } } };
  const { result, user } = (await call('post', '/api/auth/account/import', target, elsewhere).expect(200)).body.data;
  assert.equal(result.preferences, 'skipped');
  assert.equal(user.preferences.onboarding, 'done');
  assert.equal(result.unlinked, 0);
  const analysis = await Course.findOne({ where: { name: 'Analiz' }, include: [{ model: Topic, as: 'topics' }] });
  assert.deepEqual([analysis.userId, analysis.isGlobal, analysis.categoryId], [target.id, false, shared.common.id]);
  assert.deepEqual(analysis.topics.map((topic) => [topic.name, topic.estimatedTime, topic.difficulty]), [['Türev', 45, 'Zor']]);
  const measured = (await sessionsOf(target)).find((session) => session.title === 'Türev çalış');
  assert.deepEqual([measured.courseId, measured.topicId], [analysis.id, analysis.topics[0].id]);
  assert.equal((await CourseGoal.findOne({ where: { userId: target.id } })).courseId, analysis.id);
});
