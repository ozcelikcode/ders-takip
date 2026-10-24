const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-audit-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const logFile = path.join(directory, 'admin-audit.jsonl');
const password = 'fixture-password';
const sign = async (user) => { user.token = (await createAuthSession(user)).tokens.accessToken; return user; };
const auth = (method, url, user) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
const account = (username, role = 'student') => User.create({ username, email: `${username}@example.com`, password, firstName: 'Test', lastName: 'User', role }).then(sign);
const log = async (user, query = '') => (await auth('get', `/api/admin-audit${query}`, user).expect(200)).body.data;
const lastEntry = async (user) => (await log(user)).entries[0];
let admin, student;

before(async () => {
  await applyMigrations();
  admin = await account('chief', 'admin');
  student = await account('learner');
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('asks for the administrator password before granting administration, deleting an account and resetting data', async () => {
  const target = await account('target');
  const role = (body) => auth('put', `/api/users/${target.id}`, admin).send(body);
  // Missing, then wrong: neither changes anything, and the wrong one is logged.
  assert.equal((await role({ role: 'admin' }).expect(400)).body.error.code, 'validation');
  assert.equal((await role({ role: 'admin', adminPassword: 'not-it' }).expect(400)).body.error.code, 'wrongPassword');
  assert.equal((await target.reload()).role, 'student');
  assert.deepEqual((({ action, actor, details }) => ({ action, actor, details }))(await lastEntry(admin)), { action: 'confirmationFailed', actor: { id: admin.id, username: 'chief' }, details: { operation: 'roleChange' } });
  await role({ role: 'admin', adminPassword: password }).expect(200);
  assert.deepEqual((({ action, target: who, details }) => ({ action, who, details }))(await lastEntry(admin)), { action: 'userRoleChanged', who: { id: target.id, username: 'target' }, details: { role: 'admin' } });

  // Other changes need no password.
  await auth('put', `/api/users/${student.id}`, admin).send({ isActive: false }).expect(200);
  assert.equal((await lastEntry(admin)).action, 'userDeactivated');
  await auth('put', `/api/users/${student.id}`, admin).send({ isActive: true }).expect(200);

  const create = (body) => auth('post', '/api/users', admin).send({ email: `${body.username}@example.com`, password: 'new-account-password', firstName: 'New', lastName: 'Person', ...body });
  await create({ username: 'helper', role: 'admin' }).expect(400);
  await create({ username: 'helper', role: 'admin', adminPassword: password }).expect(201);
  await create({ username: 'plain' }).expect(201);
  assert.deepEqual((await log(admin)).entries.slice(0, 2).map((entry) => [entry.action, entry.target.username, entry.details.role]), [['userCreated', 'plain', 'student'], ['userCreated', 'helper', 'admin']]);

  await auth('delete', `/api/users/${target.id}`, admin).send({}).expect(400);
  await auth('delete', `/api/users/${target.id}`, admin).send({ adminPassword: 'not-it' }).expect(400);
  await auth('delete', `/api/users/${target.id}`, admin).send({ adminPassword: password }).expect(200);
  // The entry keeps the deleted account's name.
  assert.deepEqual((({ action, target: who }) => ({ action, who }))(await lastEntry(admin)), { action: 'userDeleted', who: { id: target.id, username: 'target' } });

  await auth('post', '/api/backup/reset', admin).send({ mode: 'settings_only' }).expect(400);
  await auth('post', '/api/backup/reset', admin).send({ mode: 'settings_only', adminPassword: password }).expect(200);
  const reset = await lastEntry(admin);
  assert.equal(reset.action, 'dataReset');
  assert.equal(reset.details.mode, 'settings_only');
  assert.equal(typeof reset.details.safetyBackupId, 'number');

  // Passwords never reach the log.
  const text = readFileSync(logFile, 'utf8');
  assert.equal(text.includes(password), false);
  assert.equal(text.includes('not-it'), false);
});

it('logs administrator sign-ins and wrong passwords for administrator accounts, and setting names without values', async () => {
  const signIn = (email, secret) => request(app).post('/api/auth/login').set('X-Requested-With', 'StudyTracker').send({ email, password: secret });
  const before = (await log(admin)).integrity.total;
  await signIn('chief@example.com', 'wrong-password').expect(401);
  await signIn('chief@example.com', password).expect(200);
  // Students and unknown addresses are not logged.
  await signIn('learner@example.com', 'wrong-password').expect(401);
  await signIn('learner@example.com', password).expect(200);
  await signIn('nobody@example.com', 'wrong-password').expect(401);
  await auth('put', '/api/settings', admin).send({ siteName: 'Audited Site', sessionTimeout: 30 }).expect(200);
  const page = await log(admin);
  assert.equal(page.integrity.total, before + 3);
  assert.deepEqual(page.entries.slice(0, 3).map((entry) => [entry.action, entry.actor?.username ?? null, entry.target?.username ?? null]), [
    ['settingsChanged', 'chief', null],
    ['signedIn', 'chief', null],
    ['signInFailed', null, 'chief'],
  ]);
  assert.deepEqual(page.entries[0].details, { keys: ['siteName', 'sessionTimeout'] });
  assert.equal(readFileSync(logFile, 'utf8').includes('Audited Site'), false);
});

it('pages newest first, is for administrators only, and reports the first entry that was changed or removed', async () => {
  // The deactivation above ended the student's sessions.
  await auth('get', '/api/admin-audit', await sign(await User.findByPk(student.id))).expect(403);
  const all = await log(admin, '?limit=200');
  assert.equal(all.integrity.intact, true);
  assert.deepEqual(all.entries.map((entry) => entry.seq), Array.from({ length: all.integrity.total }, (_, index) => all.integrity.total - index));
  const first = await log(admin, '?limit=2');
  assert.equal(first.hasMore, true);
  const next = await log(admin, `?limit=2&before=${first.entries[1].seq}`);
  assert.equal(next.entries[0].seq, first.entries[1].seq - 1);

  const original = readFileSync(logFile, 'utf8');
  const lines = original.trim().split('\n');
  const edited = JSON.parse(lines[2]);
  edited.actor = { id: 999, username: 'someone-else' };
  writeFileSync(logFile, [...lines.slice(0, 2), JSON.stringify(edited), ...lines.slice(3)].join('\n') + '\n');
  assert.deepEqual((await log(admin)).integrity, { intact: false, brokenAt: 3, total: lines.length });
  writeFileSync(logFile, [...lines.slice(0, 4), ...lines.slice(5)].join('\n') + '\n');
  assert.equal((await log(admin)).integrity.brokenAt, 5);
  writeFileSync(logFile, original);
  assert.equal((await log(admin)).integrity.intact, true);
});

it('keeps the log when a backup is restored, because it lives outside the database', async () => {
  const backup = (await auth('post', '/api/backup/create', admin).expect(200)).body.data;
  await auth('put', '/api/settings', admin).send({ siteName: 'After Backup' }).expect(200);
  const before = (await log(admin)).integrity.total;
  await auth('post', `/api/backup/restore/${backup.id}`, admin).send({ adminPassword: 'not-it' }).expect(400);
  await auth('post', `/api/backup/restore/${backup.id}`, admin).send({ adminPassword: password }).expect(200);
  // A restore signs everyone out.
  const reader = await sign(await User.findByPk(admin.id));
  const page = await log(reader);
  assert.equal(page.integrity.intact, true);
  assert.equal(page.integrity.total, before + 2);
  assert.deepEqual(page.entries.slice(0, 2).map((entry) => [entry.action, entry.details]), [
    ['backupRestored', { backupId: backup.id }],
    ['confirmationFailed', { operation: 'backupRestore' }],
  ]);
});
