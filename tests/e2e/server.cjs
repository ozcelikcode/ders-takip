const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { once } = require('node:events');
const express = require('express');

// This entry point only accepts a fresh directory owned by its test fixture.
const directory = fs.realpathSync(process.argv[2]);
assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
assert.ok(path.basename(directory).startsWith('study-tracker-e2e-'));
assert.deepEqual(fs.readdirSync(directory), []);
Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_PATH: path.join(directory, 'test.sqlite'),
  BACKUP_DIR: path.join(directory, 'backups'),
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
});
const site = express();
let server;
let sequelize;
let stopping;
let verifyData;
const close = () =>
  (stopping ??= (async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      if (verifyData) await verifyData();
    } finally {
      if (sequelize) await sequelize.close();
      if (process.connected) process.disconnect();
    }
  })());
const shutdown = () =>
  void close().catch((error) => {
    console.error(`E2E fixture cleanup failed: ${error.name}`);
    process.exitCode = 1;
  });
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
process.once('disconnect', shutdown);

(async () => {
  server = site.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  process.env.FRONTEND_URL = url;
  const app = require('../../backend/dist/app').default;
  ({ sequelize } = require('../../backend/dist/config/database'));
  const { applyMigrations } = require('../../backend/dist/database/migrations');
  const {
    User,
    StudySession,
    SessionInterval,
  } = require('../../backend/dist/models');
  const { dateKeyInZone } = require('@study-tracker/contracts');
  await applyMigrations();
  const day = dateKeyInZone(new Date(), 'Europe/Istanbul');
  const owner = await User.create({
    username: 'owner',
    email: 'owner@example.test',
    password: 'fixture-password',
    firstName: 'First',
    lastName: 'Student',
  });
  await User.create({
    username: 'other',
    email: 'other@example.test',
    password: 'fixture-password',
    firstName: 'Second',
    lastName: 'Student',
  });
  await User.create({
    username: 'manager', email: 'manager@example.test', password: 'fixture-password',
    firstName: 'Fixture', lastName: 'Manager', role: 'admin',
  });
  const at = (time) => new Date(`${day}T${time}:00.000+03:00`);
  for (const [id, title, start, end, duration, status] of [
    [701, 'First short session', '09:59', '10:00', 1, 'planned'],
    [702, 'Second short session', '10:00', '10:01', 1, 'planned'],
    [703, 'Cancelled overlay', '10:00', '10:01', 1, 'cancelled'],
    [704, 'Last minute session', '23:59', '24:00', 1, 'planned'],
    [705, 'Movable session', '13:00', '14:00', 60, 'planned'],
    [706, 'Private completed session', '11:00', '12:00', 60, 'completed'],
  ]) {
    await StudySession.create({
      id,
      userId: owner.id,
      title,
      startTime: at(start),
      endTime: at(end),
      duration,
      status,
      sessionType: 'study',
      notes: 'Preserve fixture notes',
      ...(status === 'completed' ? { completedAt: at(end) } : {}),
    });
  }
  await SessionInterval.create({
    sessionId: 706,
    kind: 'study',
    startedAt: at('11:00'),
    endedAt: at('11:05'),
  });
  const protectedIds = [701, 702, 703, 704, 706];
  const readProtected = async () =>
    JSON.stringify(
      await StudySession.findAll({
        where: { id: protectedIds },
        order: [['id', 'ASC']],
      }),
    );
  const beforeSessions = await readProtected();
  const beforeIntervals = JSON.stringify(await SessionInterval.findAll());
  verifyData = async () => {
    const [integrity] = await sequelize.query('PRAGMA integrity_check');
    const [foreignKeys] = await sequelize.query('PRAGMA foreign_key_check');
    assert.deepEqual(integrity, [{ integrity_check: 'ok' }]);
    assert.deepEqual(foreignKeys, []);
    assert.equal(await readProtected(), beforeSessions);
    assert.equal(
      JSON.stringify(await SessionInterval.findAll()),
      beforeIntervals,
    );
    assert.equal(
      (await StudySession.findByPk(705)).notes,
      'Preserve fixture notes',
    );
  };
  site.use((request, response, next) =>
    request.path.startsWith('/api/') ? app(request, response, next) : next(),
  );
  site.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
  site.get('*', (_request, response) =>
    response.sendFile(
      path.resolve(__dirname, '../../frontend/dist/index.html'),
    ),
  );
  process.send({ url, day });
})().catch(async (error) => {
  console.error(`E2E fixture failed: ${error.name}`);
  await close();
  process.exitCode = 1;
  process.disconnect();
});
