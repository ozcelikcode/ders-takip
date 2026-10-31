const { before, beforeEach, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-reset-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups'), FRONTEND_URL: 'http://app.test' });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, PasswordResetToken, AuthSession } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');
const { mailer } = require('../dist/services/mailer');

let member, admin, inactive;
const post = (url, user) => {
  const operation = request(app).post(url).set('X-Requested-With', 'StudyTracker');
  return user ? operation.auth(generateAccessToken({ id: String(user.id), sid: user.sessionId }), { type: 'bearer' }) : operation;
};
const tokenFrom = (url) => new URL(url).searchParams.get('token');
const withMail = (t) => {
  const sent = [];
  t.mock.method(mailer, 'enabled', () => true);
  t.mock.method(mailer, 'send', async (message) => { sent.push(message); });
  return sent;
};

before(async () => {
  await applyMigrations();
  const create = (name, extra = {}) => User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', ...extra });
  member = await create('member');
  admin = await create('admin', { role: 'admin' });
  inactive = await create('dormant', { isActive: false });
  admin.sessionId = (await createAuthSession(admin)).session.id;
});
beforeEach(async () => {
  await PasswordResetToken.destroy({ where: {} });
  member.sessionId = (await createAuthSession(member)).session.id;
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('tells the client to ask an administrator when SMTP is not configured, without issuing a token', async () => {
  const response = await post('/api/auth/forgot-password').send({ email: 'member@example.com' }).expect(200);
  assert.deepEqual(response.body.data, { delivery: 'admin' });
  assert.equal(await PasswordResetToken.count(), 0);
});

it('mails a link only to active accounts, answers identically for unknown addresses and throttles resends', async (t) => {
  const sent = withMail(t);
  for (const email of ['member@example.com', 'nobody@example.com', 'dormant@example.com', 'member@example.com'])
    assert.deepEqual((await post('/api/auth/forgot-password').send({ email }).expect(200)).body.data, { delivery: 'email' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'member@example.com');
  const link = sent[0].text.match(/http:\/\/app\.test\/reset-password\?token=[\w-]{43}/)[0];
  const stored = await PasswordResetToken.findOne();
  assert.notEqual(stored.tokenHash, tokenFrom(link));
  assert.equal(stored.issuedBy, 'self');
});

it('resets once, signs every session out and rejects reused, expired or malformed tokens', async (t) => {
  const sent = withMail(t);
  await post('/api/auth/forgot-password').send({ email: 'member@example.com' }).expect(200);
  await new Promise((resolve) => setImmediate(resolve));
  const token = tokenFrom(sent[0].text.match(/http\S+/)[0]);
  await post('/api/auth/reset-password').send({ token, password: 'short' }).expect(400);
  await post('/api/auth/reset-password').send({ token, password: 'new-fixture-password' }).expect(200);
  assert.equal(await AuthSession.count({ where: { userId: member.id, revokedAt: null } }), 0);
  await post('/api/auth/login').send({ email: 'member@example.com', password: 'new-fixture-password' }).expect(200);
  await post('/api/auth/login').send({ email: 'member@example.com', password: 'fixture-password' }).expect(401);
  await post('/api/auth/reset-password').send({ token, password: 'another-fixture-password' }).expect(400);
  await post('/api/auth/reset-password').send({ token: 'x'.repeat(10), password: 'another-fixture-password' }).expect(400);
  const fresh = await post(`/api/users/${member.id}/password-reset-link`, admin).expect(200);
  await PasswordResetToken.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { userId: member.id, usedAt: null } });
  await post('/api/auth/reset-password').send({ token: tokenFrom(fresh.body.data.url), password: 'another-fixture-password' }).expect(400);
  member.password = 'fixture-password'; await member.save();
});

it('lets only administrators issue a link, refuses inactive accounts and invalidates older links', async () => {
  await post(`/api/users/${admin.id}/password-reset-link`, member).expect(403);
  await post(`/api/users/${inactive.id}/password-reset-link`, admin).expect(409);
  await post('/api/users/999999/password-reset-link', admin).expect(404);
  const first = (await post(`/api/users/${member.id}/password-reset-link`, admin).expect(200)).body.data;
  const second = (await post(`/api/users/${member.id}/password-reset-link`, admin).expect(200)).body.data;
  assert.ok(Date.parse(second.expiresAt) > Date.now());
  await post('/api/auth/reset-password').send({ token: tokenFrom(first.url), password: 'admin-issued-password' }).expect(400);
  await post('/api/auth/reset-password').send({ token: tokenFrom(second.url), password: 'admin-issued-password' }).expect(200);
  member.password = 'fixture-password'; await member.save();
});

it('asks for the acting administrator password before issuing a link for another administrator', async () => {
  const deputy = await User.create({ username: 'deputy', email: 'deputy@example.com', password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'admin' });
  try {
    assert.equal((await post(`/api/users/${deputy.id}/password-reset-link`, admin).expect(400)).body.error.code, 'wrongPassword');
    await post(`/api/users/${deputy.id}/password-reset-link`, admin).send({ adminPassword: 'not-the-password' }).expect(400);
    assert.equal(await PasswordResetToken.count({ where: { userId: deputy.id } }), 0);
    await post(`/api/users/${deputy.id}/password-reset-link`, admin).send({ adminPassword: 'fixture-password' }).expect(200);
  } finally {
    await deputy.destroy();
  }
});
