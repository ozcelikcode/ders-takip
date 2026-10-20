const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-onboarding-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups'), FRONTEND_URL: 'http://app.test' });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { Category, Course, User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');
const { defaultPreferences } = require('@study-tracker/contracts');

let admin, shared;
const as = async (user) => {
  user.sessionId ??= (await createAuthSession(user)).session.id;
  return generateAccessToken({ id: String(user.id), sid: user.sessionId });
};
const post = async (url, user, body) => request(app).post(url).set('X-Requested-With', 'StudyTracker').auth(await as(user), { type: 'bearer' }).send(body);
const register = (username) => request(app).post('/api/auth/register').set('X-Requested-With', 'StudyTracker').set('Origin', 'http://app.test')
  .send({ username, email: `${username}@example.com`, password: 'Fixture-pass-2026', firstName: 'Yeni', lastName: 'Kullanıcı', timezone: 'America/New_York' });
const answers = {
  terminologyPreset: 'skills', studyField: 'Gitar', timezone: 'Asia/Tokyo', weekStartsOn: 0,
  activeStudyDays: [0, 2, 4], dailyStudyGoal: 0.75,
  defaultPomodoroDuration: 50, defaultShortBreak: 10, defaultLongBreak: 20, pomodorosUntilLongBreak: 3,
};

before(async () => {
  await applyMigrations();
  admin = await User.create({ username: 'admin', email: 'admin@example.com', password: 'fixture-password', firstName: 'Test', lastName: 'Admin', role: 'admin' });
  shared = await Category.create({ name: 'Müzik', color: '#444444', order: 1, userId: null });
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('self-registered and admin-created accounts start onboarding; existing accounts do not', async () => {
  const registered = await register('newcomer');
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  assert.equal(registered.body.data.user.preferences.onboarding, 'pending');
  assert.equal(registered.body.data.user.preferences.timezone, 'America/New_York');
  const managed = await post('/api/users', admin, { username: 'managed', email: 'managed@example.com', password: 'Fixture-pass-2026', firstName: 'Yönetilen', lastName: 'Hesap' });
  assert.equal(managed.status, 201, JSON.stringify(managed.body));
  assert.equal((await User.findOne({ where: { username: 'managed' } })).preferences.onboarding, 'pending');
  assert.equal(admin.preferences.onboarding, undefined);
  assert.equal((await post('/api/onboarding', admin, { preferences: answers, workspace: null })).status, 409);
});

it('finishing onboarding applies the answers and creates the personal workspace in one step', async () => {
  const user = await User.findOne({ where: { username: 'newcomer' } });
  const response = await post('/api/onboarding', user, { preferences: answers, workspace: { categoryName: 'Enstrüman', courseNames: ['Akorlar', 'Ritim'] } });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const { preferences } = response.body.data.user;
  assert.equal(preferences.onboarding, 'done');
  assert.deepEqual({ ...preferences, onboarding: undefined, schemaVersion: undefined }, { ...defaultPreferences, ...answers, weeklyStudyGoal: 2.25, onboarding: undefined, schemaVersion: undefined });
  const category = await Category.findOne({ where: { name: 'Enstrüman' } });
  assert.equal(category.userId, user.id);
  const courses = await Course.findAll({ where: { categoryId: category.id }, order: [['order', 'ASC']] });
  assert.deepEqual(courses.map(course => [course.name, course.order, course.userId, course.isGlobal]), [['Akorlar', 1, user.id, false], ['Ritim', 2, user.id, false]]);
  // A second submit (double click, second tab) is refused instead of duplicating records.
  assert.equal((await post('/api/onboarding', user, { preferences: answers, workspace: { categoryName: 'Enstrüman', courseNames: ['Akorlar'] } })).status, 409);
  assert.equal(await Course.count({ where: { categoryId: category.id } }), 2);
});

it('restarting onboarding reuses visible names instead of duplicating them', async () => {
  const user = await User.findOne({ where: { username: 'newcomer' } });
  user.preferences = { ...user.preferences, onboarding: 'pending' };
  await user.save();
  const response = await post('/api/onboarding', user, { preferences: answers, workspace: { categoryName: 'Enstrüman', courseNames: ['Ritim', 'Teori'] } });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const category = await Category.findOne({ where: { name: 'Enstrüman', userId: user.id } });
  assert.deepEqual((await Course.findAll({ where: { categoryId: category.id }, order: [['order', 'ASC']] })).map(course => course.name), ['Akorlar', 'Ritim', 'Teori']);
  // A shared category with the requested name is used rather than shadowed by a personal copy.
  const managed = await User.findOne({ where: { username: 'managed' } });
  assert.equal((await post('/api/onboarding', managed, { preferences: answers, workspace: { categoryName: 'Müzik', courseNames: ['Solfej'] } })).status, 200);
  assert.equal(await Category.count({ where: { name: 'Müzik' } }), 1);
  assert.equal((await Course.findOne({ where: { name: 'Solfej' } })).categoryId, shared.id);
});

it('a failure part-way leaves preferences and records untouched', async (t) => {
  const response = await register('rollback');
  const user = await User.findByPk(response.body.data.user.id);
  t.mock.method(Course, 'create', async () => { throw new Error('simulated write failure'); });
  assert.equal((await post('/api/onboarding', user, { preferences: answers, workspace: { categoryName: 'Yarım', courseNames: ['Bir'] } })).status, 500);
  assert.equal(await Category.count({ where: { name: 'Yarım' } }), 0);
  assert.equal((await User.findByPk(user.id)).preferences.onboarding, 'pending');
});

it('skipping onboarding is an ordinary preference update', async () => {
  const user = await User.findOne({ where: { username: 'rollback' } });
  const response = await request(app).put('/api/auth/profile').set('X-Requested-With', 'StudyTracker').auth(await as(user), { type: 'bearer' }).send({ preferences: { onboarding: 'done' } });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.data.user.preferences.onboarding, 'done');
  assert.equal((await post('/api/onboarding', user, { preferences: answers, workspace: null })).status, 409);
});

it('every preference write keeps the weekly goal equal to the daily goal on active days', async () => {
  const user = await User.findOne({ where: { username: 'rollback' } });
  const update = async (preferences) => (await request(app).put('/api/auth/profile').set('X-Requested-With', 'StudyTracker').auth(await as(user), { type: 'bearer' }).send({ preferences })).body.data.user.preferences;
  let stored = await update({ dailyStudyGoal: 0.5, activeStudyDays: [1, 2, 3, 4] });
  assert.equal(stored.weeklyStudyGoal, 2);
  // A stale or hand-made weekly value is replaced, not kept.
  stored = await update({ weeklyStudyGoal: 40 });
  assert.equal(stored.weeklyStudyGoal, 2);
  stored = await update({ activeStudyDays: [] });
  assert.equal(stored.weeklyStudyGoal, 0);
});

it('invalid answers are rejected before anything is written', async () => {
  const user = await User.findOne({ where: { username: 'managed' } });
  user.preferences = { ...user.preferences, onboarding: 'pending' };
  await user.save();
  for (const body of [{ preferences: { ...answers, theme: 'dark' }, workspace: null }, { preferences: answers }, { preferences: answers, workspace: { categoryName: 'X', courseNames: [] } }]) {
    assert.equal((await post('/api/onboarding', user, body)).status, 400);
  }
  assert.equal((await User.findByPk(user.id)).preferences.onboarding, 'pending');
});
