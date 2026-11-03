const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-system-'));
const secret = randomBytes(48).toString('hex');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: secret, DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups'), SMTP_HOST: 'smtp.example.org', SMTP_PASS: 'smtp-secret-value', SMTP_USER: 'mailer', MAIL_FROM: 'noreply@example.org' });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations, requiredMigrations } = require('../dist/database/migrations');
const { User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { systemStatusSchema } = require('@study-tracker/contracts');
let admin, student;
const auth = (user) => request(app).get('/api/admin/system').set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
before(async () => {
  await applyMigrations();
  admin = await User.create({ username: 'admin', email: 'admin@example.com', password: 'fixture-password', firstName: 'Admin', lastName: 'User', role: 'admin' });
  admin.token = (await createAuthSession(admin)).tokens.accessToken;
  student = await User.create({ username: 'student', email: 'student@example.com', password: 'fixture-password', firstName: 'Some', lastName: 'Student' });
  student.token = (await createAuthSession(student)).tokens.accessToken;
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('shows administrators the server, database, activity and configuration, uncached', async () => {
  const response = await auth(admin).expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  const status = systemStatusSchema.parse(response.body.data);
  assert.equal(status.database.migrations.applied, requiredMigrations.length);
  assert.equal(status.database.tables.find((table) => table.name === 'users').rows, 2);
  assert.ok(status.database.sizeBytes > 0);
  assert.deepEqual([status.activity.users, status.activity.administrators, status.activity.openSignIns], [2, 1, 2]);
  assert.deepEqual(status.configuration.email, { enabled: true, host: 'smtp.example.org', port: 587 });
  assert.equal(status.configuration.push.enabled, false);
});
it('never carries a secret, and is closed to everyone but administrators', async () => {
  const body = JSON.stringify((await auth(admin).expect(200)).body);
  for (const value of [secret, 'smtp-secret-value', 'fixture-password', admin.password]) assert.equal(body.includes(value), false);
  await auth(student).expect(403);
  await request(app).get('/api/admin/system').set('X-Requested-With', 'StudyTracker').expect(401);
});
