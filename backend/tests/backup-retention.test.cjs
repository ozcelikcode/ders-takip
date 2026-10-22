const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const directory = mkdtempSync(path.join(tmpdir(), 'study-backup-retention-'));
const primary = path.join(directory, 'backups');
const copies = path.join(directory, 'copies');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'live.sqlite'), BACKUP_DIR: primary, BACKUP_COPY_DIR: copies });
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { automaticBackupsKept, mirrorBackups, performBackup, runScheduledBackup } = require('../dist/services/backups');
const { Backup } = require('../dist/models');

const day = 86400000;
const snapshots = async (folder) => (await fs.readdir(folder)).filter((name) => /^backup-(auto|manual)-.*\.sqlite$/.test(name)).sort();
const sha256 = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex');
let manual;
const created = [];
before(async () => {
  await applyMigrations();
  manual = await performBackup('manual');
  await fs.mkdir(copies, { recursive: true });
  await fs.writeFile(path.join(copies, 'notes.txt'), 'not a snapshot');
  // The default interval is a week, so each run eight days later is due.
  for (let run = 1; run <= automaticBackupsKept + 2; run++) {
    assert.equal(await runScheduledBackup(new Date(Date.now() + run * 8 * day)), true);
    created.push((await Backup.findAll({ where: { type: 'auto' }, order: [['id', 'DESC']], limit: 1 }))[0].filename);
  }
});
after(async () => {
  await sequelize.close();
  rmSync(directory, { recursive: true, force: true });
});

it('keeps the newest automatic snapshots and every manual one', async () => {
  const kept = await snapshots(primary);
  assert.equal(kept.filter((name) => name.startsWith('backup-auto-')).length, automaticBackupsKept);
  for (const pruned of created.slice(0, 2)) {
    assert.equal(kept.includes(pruned), false, pruned);
    await assert.rejects(fs.access(path.join(primary, `${pruned}.json`)));
    assert.equal(await Backup.count({ where: { filename: pruned } }), 0);
  }
  assert.ok(kept.includes(manual.filename));
  assert.equal(await Backup.count({ where: { type: 'auto' } }), automaticBackupsKept);
});

it('mirrors exactly the kept snapshots with their manifests and leaves other files alone', async () => {
  assert.deepEqual(await snapshots(copies), await snapshots(primary));
  for (const name of await snapshots(primary)) {
    assert.equal(await sha256(path.join(copies, name)), await sha256(path.join(primary, name)), name);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(copies, `${name}.json`), 'utf8')), JSON.parse(await fs.readFile(path.join(primary, `${name}.json`), 'utf8')));
  }
  assert.equal(await fs.readFile(path.join(copies, 'notes.txt'), 'utf8'), 'not a snapshot');
  assert.equal((await fs.readdir(copies)).some((name) => name.endsWith('.partial')), false);
});

it('still takes a backup when the copy folder fails and catches up on the next run', { skip: process.getuid?.() === 0 && 'root ignores folder permissions' }, async () => {
  await fs.chmod(copies, 0o500);
  try {
    const entry = await performBackup('manual');
    await mirrorBackups();
    await assert.rejects(fs.access(path.join(copies, entry.filename)));
    await fs.chmod(copies, 0o700);
    await mirrorBackups();
    assert.equal(await sha256(path.join(copies, entry.filename)), await sha256(entry.path));
  } finally {
    await fs.chmod(copies, 0o700);
  }
});

it('refuses a copy folder that is the backup folder itself', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./dist/config/database')"], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, BACKUP_COPY_DIR: primary },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BACKUP_COPY_DIR must differ from BACKUP_DIR/);
});
