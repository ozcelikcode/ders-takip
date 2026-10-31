const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync, readdirSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-contracts-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(48).toString('hex'),
  DB_PATH: path.join(directory, 'fixture.sqlite'),
  BACKUP_DIR: path.join(directory, 'backups'),
});
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, AuthSession, Backup } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const {
  authResponseSchema,
  profileResponseSchema,
  managedUserListResponseSchema,
  backupCreateResponseSchema,
  backupListResponseSchema,
} = require('@study-tracker/contracts');
const registration = {
  username: ' registered ',
  email: 'registered@example.com',
  password: 'fixture-password',
  firstName: ' New ',
  lastName: ' Student ',
};
let admin, target;
const auth = (method, url, actor = admin) => {
  const operation = request(app)[method](url);
  return operation
    .set('X-Requested-With', 'StudyTracker')
    .auth(actor.token, { type: 'bearer' });
};
before(async () => {
  await applyMigrations();
  admin = await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'fixture-password',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  });
  admin.token = (await createAuthSession(admin)).tokens.accessToken;
  target = await User.create({
    username: 'target',
    email: 'target@example.com',
    password: 'fixture-password',
    firstName: 'Target',
    lastName: 'User',
    role: 'admin',
    isActive: false,
  });
});
after(async () => {
  await sequelize.close();
  rmSync(directory, { recursive: true, force: true });
});
it('uses normalized registration fields and projects safe consistent auth/profile/refresh DTOs', async () => {
  const first = await request(app)
    .post('/api/auth/register')
    .set('X-Requested-With', 'StudyTracker')
    .send(registration)
    .expect(201);
  assert.equal(authResponseSchema.safeParse(first.body).success, true);
  const user = first.body.data.user;
  assert.equal(user.username, 'registered');
  assert.equal(user.firstName, 'New');
  assert.equal(user.role, 'student');
  assert.equal('password' in user, false);
  assert.equal('legacyPreferences' in user.preferences, false);
  const cookie = first.headers['set-cookie'][0].split(';')[0];
  const refresh = await request(app)
    .post('/api/auth/refresh-token')
    .set('X-Requested-With', 'StudyTracker')
    .set('Cookie', cookie)
    .expect(200);
  assert.equal(authResponseSchema.safeParse(refresh.body).success, true);
  assert.deepEqual(
    Object.keys(refresh.body.data.user).sort(),
    Object.keys(user).sort(),
  );
  const profile = await auth('get', '/api/auth/me', {
    token: refresh.body.data.tokens.accessToken,
  }).expect(200);
  assert.equal(profileResponseSchema.safeParse(profile.body).success, true);
});
it('rejects public privilege fields, unknown fields and invalid profile changes before persistence', async () => {
  const before = await User.count();
  for (const patch of [
    { role: 'admin' },
    { isActive: true },
    { password: 'ü'.repeat(37) },
  ])
    await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'StudyTracker')
      .send({ ...registration, ...patch })
      .expect(400);
  assert.equal(await User.count(), before);
  for (const body of [
    {},
    { firstName: ' ' },
    { preferences: null },
    { email: 'changed@example.com' },
    { profileImage: 'javascript:alert(1)' },
  ])
    await auth('put', '/api/auth/profile').send(body).expect(400);
  assert.equal((await admin.reload()).email, 'admin@example.com');
});
it('preserves role, active status and unrelated preferences in sparse normalized patches', async () => {
  const response = await auth('put', `/api/users/${target.id}`)
    .send({ firstName: ' Changed ', preferences: { theme: 'dark' } })
    .expect(200);
  const updated = response.body.data.user;
  assert.equal(updated.firstName, 'Changed');
  assert.equal(updated.role, 'admin');
  assert.equal(updated.isActive, false);
  assert.equal(updated.preferences.theme, 'dark');
  assert.equal(updated.preferences.defaultPomodoroDuration, 25);
  assert.equal(profileResponseSchema.safeParse(response.body).success, true);
  await auth('put', `/api/users/${admin.id}`)
    .send({ firstName: ' Current ' })
    .expect(200);
  assert.equal((await admin.reload()).role, 'admin');
});
it('validates user path/query/body boundaries without revoking sessions on invalid requests', async () => {
  const active = await AuthSession.count({ where: { revokedAt: null } });
  for (const query of [
    'page=1junk',
    'limit=201',
    'page=1&page=2',
    'role=owner',
    'isActive=maybe',
    'sortBy=password',
    'includeStats=yes',
  ])
    await auth('get', `/api/users?${query}`).expect(400);
  for (const id of ['0', '-1', '1junk', '9007199254740992']) {
    await auth('put', `/api/users/${id}`).send({ isActive: false }).expect(400);
    await auth('delete', `/api/users/${id}`).expect(400);
  }
  for (const body of [
    {},
    { isActive: 'false' },
    { role: 'owner' },
    { preferences: { unknown: true } },
    { username: 'changed' },
  ])
    await auth('put', `/api/users/${target.id}`).send(body).expect(400);
  assert.equal(await AuthSession.count({ where: { revokedAt: null } }), active);
  const listing = await auth('get', '/api/users?includeStats=true').expect(200);
  assert.equal(
    managedUserListResponseSchema.safeParse(listing.body).success,
    true,
  );
});
it('validates backup commands before creating safety snapshots or touching existing data', async () => {
  const users = await User.count(),
    backups = await Backup.count();
  for (const id of ['0', '1junk', '-2', '9007199254740992'])
    await auth('post', `/api/backup/restore/${id}`).expect(400);
  for (const body of [
    {},
    { mode: 'all', extra: true },
    { mode: ['all'] },
    { mode: 'everything' },
  ])
    await auth('post', '/api/backup/reset').send(body).expect(400);
  assert.equal(await User.count(), users);
  assert.equal(await Backup.count(), backups);
  assert.equal(
    existsSync(path.join(directory, 'backups'))
      ? readdirSync(path.join(directory, 'backups')).length
      : 0,
    0,
  );
});
it('projects backup responses without server paths while retaining verified snapshot behavior', async () => {
  const created = await auth('post', '/api/backup/create').expect(200);
  assert.equal(
    backupCreateResponseSchema.safeParse(created.body).success,
    true,
  );
  assert.equal(created.body.data.verified, true);
  assert.equal('path' in created.body.data, false);
  const listing = await auth('get', '/api/backup').expect(200);
  assert.equal(backupListResponseSchema.safeParse(listing.body).success, true);
  assert.equal(listing.body.data[0].verified, true);
  assert.equal('path' in listing.body.data[0], false);
});

it('keeps request bodies small except for an account import, and hides the environment from the health check', async () => {
  const health = (await request(app).get('/api/health').expect(200)).body;
  assert.equal('environment' in health, false);
  const oversized = { firstName: 'x'.repeat(400 * 1024) };
  assert.equal((await auth('put', '/api/auth/profile').send(oversized).expect(413)).body.error.code, 'requestFailed');
  // The import parser accepts the same size; the body is then rejected for its content, not its size.
  assert.equal((await auth('post', '/api/auth/account/import').send({ format: 'x'.repeat(400 * 1024) }).expect(400)).body.success, false);
});

it('rejects unknown or malformed course list filters instead of building odd queries', async () => {
  await auth('get', '/api/courses?isActive=all&includeTopics=true').expect(200);
  await auth('get', '/api/courses?categoryId[x]=1').expect(400);
  await auth('get', '/api/courses?categoryId=0').expect(400);
  await auth('get', '/api/courses?sort=name').expect(400);
});

it('answers a taken email or username at registration with 409', async () => {
  const response = await request(app).post('/api/auth/register').set('X-Requested-With', 'StudyTracker')
    .send({ ...registration, username: 'someoneelse', email: admin.email }).expect(409);
  assert.equal(response.body.error.code, 'emailTaken');
});

it('treats email addresses without case, including older rows stored in mixed case', async () => {
  const send = (url, body) => request(app).post(url).set('X-Requested-With', 'StudyTracker').send(body);
  const created = (await send('/api/auth/register', { ...registration, username: 'mixedcase', email: ' Mixed@Example.COM ' }).expect(201)).body.data.user;
  assert.equal(created.email, 'mixed@example.com');
  await send('/api/auth/login', { email: 'MIXED@example.com', password: registration.password }).expect(200);
  await send('/api/auth/register', { ...registration, username: 'mixedcase2', email: 'mixed@EXAMPLE.com' }).expect(409);
  await User.create({ username: 'legacycase', email: 'Legacy@Example.com', password: 'fixture-password', firstName: 'Old', lastName: 'Row' });
  await send('/api/auth/login', { email: 'legacy@example.com', password: 'fixture-password' }).expect(200);
  assert.equal((await send('/api/auth/register', { ...registration, username: 'legacycase2', email: 'LEGACY@example.com' }).expect(409)).body.error.code, 'emailTaken');
});
