const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-user-management-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
let admin, student;
const auth = (method, url, user = admin) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const body = () => ({ username: 'createduser', email: 'created@example.com', password: 'fixture-password', firstName: ' Test ', lastName: ' User ' });
before(async () => {
  await applyMigrations();
  admin = await User.create({ username: 'admin', email: 'admin@example.com', password: 'fixture-password', firstName: 'Admin', lastName: 'User', role: 'admin' });
  admin.token = (await createAuthSession(admin)).tokens.accessToken;
  await User.bulkCreate(Array.from({ length: 101 }, (_, index) => ({ username: `fixture${index}`, email: `fixture${index}@example.com`, password: admin.password, firstName: index === 0 ? 'RemoteNeedle' : 'Fixture', lastName: 'User', role: 'student', createdAt: new Date('2026-01-01T09:00:00Z') })));
  student = await User.findOne({ where: { username: 'fixture0' } });
  student.token = (await createAuthSession(student)).tokens.accessToken;
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });
it('paginates beyond 100 users with stable tie ordering and server totals', async () => {
  const allIds = [];
  for (let page = 1; page <= 6; page++) {
    const { users, pagination } = (await auth('get', `/api/users?page=${page}&limit=20&includeStats=true`).expect(200)).body.data;
    assert.equal(pagination.total, 102); assert.equal(pagination.pages, 6); assert.equal(pagination.current, page);
    assert.equal(users.length, page === 6 ? 2 : 20);
    for (const user of users) { allIds.push(user.id); assert.equal(user.stats.studySeconds, 0); assert.equal('password' in user, false); }
  }
  assert.equal(new Set(allIds).size, 102);
  assert.equal(allIds.indexOf(student.id), 101);
  assert.deepEqual(allIds.slice(1), [...allIds.slice(1)].sort((a, b) => b - a));
});
it('searches the full server catalog rather than a loaded page', async () => {
  const data = (await auth('get', '/api/users?search=RemoteNeedle&limit=20&includeStats=true').expect(200)).body.data;
  assert.equal(data.pagination.total, 1); assert.equal(data.users[0].username, 'fixture0');
});
it('uses the shared create contract, normalizes names, hashes passwords and defaults to an active student', async () => {
  const { user } = (await auth('post', '/api/users').send(body()).expect(201)).body.data;
  assert.equal(user.firstName, 'Test'); assert.equal(user.lastName, 'User'); assert.equal(user.role, 'student'); assert.equal(user.isActive, true);
  assert.equal('password' in user, false);
  const saved = await User.findByPk(user.id);
  assert.notEqual(saved.password, body().password); assert.equal(await saved.comparePassword(body().password), true);
});
it('rejects invalid creation and unknown fields before storing any user', async () => {
  const count = await User.count();
  for (const patch of [{ username: 'not-valid' }, { firstName: '  ' }, { password: 'ü'.repeat(37) }, { isActive: 'false' }, { role: 'teacher' }, { confirmPassword: 'should-not-persist' }]) {
    await auth('post', '/api/users').send({ ...body(), ...patch }).expect(400);
  }
  assert.equal(await User.count(), count);
});
it('keeps management admin-only and protects the current administrator', async () => {
  const count = await User.count();
  await auth('get', '/api/users', student).expect(403);
  await auth('post', '/api/users', student).send(body()).expect(403);
  await auth('put', `/api/users/${admin.id}`).send({ role: 'student' }).expect(400);
  await auth('put', `/api/users/${admin.id}`).send({ isActive: false }).expect(400);
  await auth('delete', `/api/users/${admin.id}`).expect(400);
  assert.equal(await User.count(), count);
  assert.equal((await admin.reload()).role, 'admin'); assert.equal(admin.isActive, true);
});
it('user search ignores case and Turkish letter forms and treats wildcards literally', async () => {
  await User.create({ username: 'sukru', email: 'sukru@example.com', password: 'fixture-password', firstName: 'Şükrü', lastName: 'IŞIK', role: 'student' });
  for (const search of ['sukru', 'ŞÜKRÜ', 'isik', 'ışık']) {
    const data = (await auth('get', `/api/users?search=${encodeURIComponent(search)}&limit=20`).expect(200)).body.data;
    assert.deepEqual(data.users.map((user) => user.username), ['sukru'], search);
  }
  assert.equal((await auth('get', '/api/users?search=%25&limit=20').expect(200)).body.data.pagination.total, 0);
  assert.equal((await auth('get', '/api/users?search=_&limit=20').expect(200)).body.data.pagination.total, 0);
});
