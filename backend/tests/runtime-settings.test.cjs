const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-runtime-settings-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Settings, RefreshCredential } = require('../dist/models');

const write = (url, cookie) => { const operation = request(app).post(url).set('X-Requested-With', 'StudyTracker'); return cookie ? operation.set('Cookie', cookie) : operation; };
const login = user => write('/api/auth/login').send({ email: user.email, password: 'fixture-password' });
const cookieOf = response => response.headers['set-cookie'][0].split(';')[0];
const me = token => request(app).get('/api/auth/me').set('X-Requested-With', 'StudyTracker').auth(token, { type: 'bearer' });
const setSetting = (key, value, type) => Settings.upsert({ key, value: String(value), type, category: 'security' });
let student, admin;

before(async () => {
  await applyMigrations();
  for (const role of ['student', 'admin']) {
    const user = await User.create({ username: role, email: `${role}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role });
    if (role === 'student') student = user; else admin = user;
  }
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('rejects registration while allowRegistration is off and exposes the flag publicly', async () => {
  const payload = { username: 'newcomer', email: 'newcomer@example.com', password: 'fixture-password', firstName: 'New', lastName: 'Comer' };
  await setSetting('allowRegistration', false, 'boolean');
  assert.equal((await request(app).get('/api/settings').expect(200)).body.data.allowRegistration, false);
  await write('/api/auth/register').send(payload).expect(403);
  assert.equal(await User.count({ where: { username: 'newcomer' } }), 0);
  await setSetting('allowRegistration', true, 'boolean');
  await write('/api/auth/register').send(payload).expect(201);
});

it('starts a new account in the time zone sent by the browser and rejects unknown zones', async () => {
  const payload = { username: 'tokyo', email: 'tokyo@example.com', password: 'fixture-password', firstName: 'Aki', lastName: 'Sato' };
  await write('/api/auth/register').send({ ...payload, timezone: 'Mars/Base' }).expect(400);
  const created = await write('/api/auth/register').send({ ...payload, timezone: 'Asia/Tokyo' }).expect(201);
  assert.equal(created.body.data.user.preferences.timezone, 'Asia/Tokyo');
  assert.equal((await User.findOne({ where: { username: 'tokyo' } })).preferences.timezone, 'Asia/Tokyo');
  const fallback = await write('/api/auth/register').send({ ...payload, username: 'local', email: 'local@example.com' }).expect(201);
  assert.equal(fallback.body.data.user.preferences.timezone, 'Europe/Istanbul');
});

it('starts a new account in the language sent by the browser, else Turkish', async () => {
  const payload = { username: 'london', email: 'london@example.com', password: 'fixture-password', firstName: 'Ada', lastName: 'Byron' };
  await write('/api/auth/register').send({ ...payload, language: 'de' }).expect(400);
  const created = await write('/api/auth/register').send({ ...payload, language: 'en' }).expect(201);
  assert.equal(created.body.data.user.preferences.language, 'en');
  const fallback = await write('/api/auth/register').send({ ...payload, username: 'ankara', email: 'ankara@example.com' }).expect(201);
  assert.equal(fallback.body.data.user.preferences.language, 'tr');
});

it('keeps maintenance mode open to administrators only', async () => {
  const studentToken = (await login(student).expect(200)).body.data.tokens.accessToken;
  const adminToken = (await login(admin).expect(200)).body.data.tokens.accessToken;
  await setSetting('maintenanceMode', true, 'boolean');
  assert.equal((await request(app).get('/api/settings').expect(200)).body.data.maintenanceMode, true);
  await me(studentToken).expect(503);
  await me(adminToken).expect(200);
  await login(student).expect(503);
  await login(admin).expect(200);
  await write('/api/auth/register').send({ username: 'late', email: 'late@example.com', password: 'fixture-password', firstName: 'Late', lastName: 'Comer' }).expect(503);
  await setSetting('maintenanceMode', false, 'boolean');
  await me(studentToken).expect(200);
});

it('closes sessions that stay idle past sessionTimeout but never below the access lifetime', async () => {
  await setSetting('sessionTimeout', 20, 'number');
  const response = await login(student).expect(200);
  let cookie = cookieOf(response);
  const age = async minutes => RefreshCredential.update({ createdAt: new Date(Date.now() - minutes * 60000) }, { where: { consumedAt: null } });
  await age(19);
  const refreshed = await write('/api/auth/refresh-token', cookie).expect(200);
  cookie = cookieOf(refreshed);
  await age(21);
  await write('/api/auth/refresh-token', cookie).expect(401);
  await write('/api/auth/refresh-token', cookie).expect(401);
  // A tiny timeout is clamped to the 15 minute access lifetime, so active users are not logged out early.
  await setSetting('sessionTimeout', 1, 'number');
  const second = await login(student).expect(200);
  await age(10);
  await write('/api/auth/refresh-token', cookieOf(second)).expect(200);
});
