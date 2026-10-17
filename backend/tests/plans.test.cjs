const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-plans-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(48).toString('hex'),
  DB_PATH: path.join(directory, 'fixture.sqlite'),
  BACKUP_DIR: path.join(directory, 'backups'),
});
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Plan, StudySession, SessionInterval } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { planRecordSchema } = require('@study-tracker/contracts');
let owner, other;
const auth = (method, url, actor = owner) => {
  const operation = request(app)[method](url);
  return operation
    .set('X-Requested-With', 'StudyTracker')
    .auth(actor.token, { type: 'bearer' });
};
let period = 0;
const body = () => {
  period++;
  return {
    title: ' Goal ',
    startDate: `${2099 + Math.floor((period - 1) / 12)}-${String(((period - 1) % 12) + 1).padStart(2, '0')}-01`,
    endDate: `${2099 + Math.floor((period - 1) / 12)}-${String(((period - 1) % 12) + 1).padStart(2, '0')}-10`,
  };
};
const create = async (input) =>
  (await auth('post', '/api/plans').send(input).expect(201)).body.data.plan;
before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({
      username: name,
      email: `${name}@example.com`,
      password: 'fixture-password',
      firstName: 'Test',
      lastName: 'User',
    });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user;
    else other = user;
  }
});
after(async () => {
  await sequelize.close();
  rmSync(directory, { recursive: true, force: true });
});
it('normalizes dates/default goals, validates paths and separates real empty from malformed plan queries', async () => {
  const plan = await create(body());
  assert.equal(plan.title, 'Goal');
  assert.equal(plan.startDate, '2099-01-01T00:00:00.000Z');
  assert.equal(planRecordSchema.safeParse(plan).success, true);
  assert.deepEqual(plan.goals, {
    dailyHours: 4,
    weeklyHours: 28,
    targetTopics: 10,
    priority: 'medium',
  });
  for (const id of ['1junk', '0', '-1', '9007199254740992']) {
    await auth('get', `/api/plans/${id}`).expect(400);
    await auth('get', `/api/plans/${id}/stats`).expect(400);
    await auth('delete', `/api/plans/${id}`).expect(400);
  }
  for (const query of [
    'isActive=maybe',
    'includeSessions=yes',
    'includeSessions=true&includeSessions=false',
    'unknown=true',
  ])
    await auth('get', `/api/plans?${query}`).expect(400);
  assert.equal(
    (await auth('get', '/api/plans?isActive=false').expect(200)).body.data.plans
      .length,
    0,
  );
  const count = await Plan.count();
  for (const patch of [
    { title: ' ' },
    { startDate: '01/01/2099' },
    { endDate: '2098-01-01' },
    { goals: { dailyHours: 25 } },
    { userId: other.id },
  ])
    await auth('post', '/api/plans')
      .send({ ...body(), ...patch })
      .expect(400);
  assert.equal(await Plan.count(), count);
});
it('serializes overlapping creates and validates partial dates/reactivation against the current record', async () => {
  const input = body();
  const responses = await Promise.all([
    auth('post', '/api/plans').send(input),
    auth('post', '/api/plans').send(input),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409],
  );
  const plan = responses.find((response) => response.status === 201).body.data
    .plan;
  await auth('put', `/api/plans/${plan.id}`)
    .send({ startDate: '2100-01-01' })
    .expect(400);
  await auth('put', `/api/plans/${plan.id}`)
    .send({ isActive: false })
    .expect(200);
  const replacement = await create(input);
  await auth('put', `/api/plans/${plan.id}`)
    .send({ isActive: true })
    .expect(409);
  await auth('put', `/api/plans/${replacement.id}`)
    .send({ goals: { dailyHours: 2 }, description: '' })
    .expect(200);
  const saved = await Plan.findByPk(replacement.id);
  assert.equal(saved.goals.dailyHours, 2);
  assert.equal(saved.goals.weeklyHours, 28);
  assert.equal(saved.description, '');
  assert.equal((await Plan.findByPk(plan.id)).isActive, false);
});
it('prevents concurrent active plan moves into one free range', async () => {
  const first = await create(body()),
    second = await create(body());
  const range = { startDate: '2101-01-01', endDate: '2101-01-10' };
  const responses = await Promise.all([
    auth('put', `/api/plans/${first.id}`).send(range),
    auth('put', `/api/plans/${second.id}`).send(range),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 409],
  );
});
it('scopes plan reads/writes and linked session selection to their owner', async () => {
  const plan = await create(body());
  for (const endpoint of [
    `/api/plans/${plan.id}`,
    `/api/plans/${plan.id}/stats`,
  ])
    await auth('get', endpoint, other).expect(404);
  await auth('put', `/api/plans/${plan.id}`, other)
    .send({ title: 'Foreign' })
    .expect(404);
  await auth('delete', `/api/plans/${plan.id}`, other).expect(404);
  await auth('post', '/api/study-sessions', other)
    .send({
      title: 'Foreign',
      planId: plan.id,
      startTime: '2102-01-01T09:00:00Z',
      endTime: '2102-01-01T10:00:00Z',
    })
    .expect(400);
  assert.equal(
    (await auth('get', '/api/plans', other).expect(200)).body.data.plans.length,
    0,
  );
});
it('keeps standalone sessions independent and detaches linked sessions without losing notes or measured history', async () => {
  const plan = await create(body());
  const session = await StudySession.create({
    userId: owner.id,
    planId: plan.id,
    title: 'Linked',
    notes: 'Preserve notes',
    sessionType: 'study',
    startTime: new Date('2026-01-01T09:00:00Z'),
    endTime: new Date('2026-01-01T10:00:00Z'),
    duration: 60,
    status: 'completed',
  });
  const interval = await SessionInterval.create({
    sessionId: session.id,
    kind: 'study',
    startedAt: new Date('2026-01-01T09:00:00Z'),
    endedAt: new Date('2026-01-01T09:05:00Z'),
  });
  const standalone = await StudySession.create({
    userId: owner.id,
    title: 'Standalone',
    sessionType: 'study',
    startTime: new Date('2026-01-02T09:00:00Z'),
    endTime: new Date('2026-01-02T10:00:00Z'),
    duration: 60,
  });
  const oldVersion = session.updatedAt.toISOString();
  const detail = (
    await auth('get', `/api/plans/${plan.id}?includeSessions=true`).expect(200)
  ).body.data.plan;
  assert.equal(planRecordSchema.safeParse(detail).success, true);
  assert.equal(detail.studySessions.length, 1);
  const stats = (await auth('get', `/api/plans/${plan.id}/stats`).expect(200))
    .body.data.stats;
  assert.equal(stats.studySeconds, 300);
  assert.equal(stats.totalSessions, 1);
  await auth('delete', `/api/plans/${plan.id}`).expect(200);
  await session.reload();
  assert.equal(session.planId, null);
  assert.equal(session.notes, 'Preserve notes');
  assert.equal(session.status, 'completed');
  assert.equal(session.duration, 60);
  assert.ok(session.updatedAt.toISOString() > oldVersion);
  assert.ok(await SessionInterval.findByPk(interval.id));
  assert.equal((await standalone.reload()).title, 'Standalone');
  await auth('put', `/api/study-sessions/${session.id}`)
    .send({ title: 'Stale', expectedUpdatedAt: oldVersion })
    .expect(409);
});
it('rolls back plan metadata and detached session versions after SQL write failures', async () => {
  const plan = await create(body());
  const session = await StudySession.create({
    userId: owner.id,
    planId: plan.id,
    title: 'Rollback',
    sessionType: 'study',
    startTime: new Date('2026-02-01T09:00:00Z'),
    endTime: new Date('2026-02-01T10:00:00Z'),
    duration: 60,
  });
  const original = (await session.reload()).toJSON();
  Plan.addHook('afterUpdate', 'reject-update', () => {
    throw new Error('Private injected SQL failure');
  });
  try {
    const failed = await auth('put', `/api/plans/${plan.id}`)
      .send({ title: 'Discarded' })
      .expect(500);
    assert.equal(JSON.stringify(failed.body).includes('Private'), false);
  } finally {
    Plan.removeHook('afterUpdate', 'reject-update');
  }
  assert.equal((await Plan.findByPk(plan.id)).title, 'Goal');
  Plan.addHook('afterDestroy', 'reject-delete', () => {
    throw new Error('Private injected SQL failure');
  });
  try {
    await auth('delete', `/api/plans/${plan.id}`).expect(500);
  } finally {
    Plan.removeHook('afterDestroy', 'reject-delete');
  }
  assert.ok(await Plan.findByPk(plan.id));
  assert.deepEqual((await session.reload()).toJSON(), original);
});
