const { after, before, describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const directory = mkdtempSync(path.join(tmpdir(),'study-backup-'));
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:randomBytes(48).toString('hex'),DB_PATH:path.join(directory,'live.sqlite'),BACKUP_DIR:path.join(directory,'backups')});
const { sequelize } = require('../dist/config/database');
const { applyMigrations, assertDatabaseReady } = require('../dist/database/migrations');
const { performBackup, restoreSnapshot, resetApplicationData, runScheduledBackup, isBackupDue } = require('../dist/services/backups');
const { isDatabaseUnavailable, withDatabaseMaintenance } = require('../dist/services/databaseMaintenance');
const { User, Course, Category, Settings, AuthSession, Backup } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { validateSnapshot } = require('../dist/services/sqliteSnapshots');
let admin, student, category;
before(async()=>{
  await applyMigrations(); await sequelize.query('PRAGMA journal_mode = WAL');
  admin = await User.create({username:'admin',email:'admin@example.com',password:'original-password',firstName:'Test',lastName:'Admin',role:'admin'});
  student = await User.create({username:'student',email:'student@example.com',password:'original-password',firstName:'Test',lastName:'Student'});
  category = await Category.create({name:'Test category',order:1,color:'#123456'});
  await Course.create({name:'Preserve course',categoryId:category.id,userId:student.id,order:1,color:'#123456'});
});
after(async()=>{mock.restoreAll();await sequelize.close();rmSync(directory,{recursive:true,force:true});});

describe('consistent snapshots and recovery',()=>{
  it('creates a verified WAL snapshot with a private external checksum manifest',async()=>{
    const backup = await performBackup('manual'); await validateSnapshot(backup.path);
    const manifest = JSON.parse(await fs.readFile(`${backup.path}.json`,'utf8'));
    assert.equal(manifest.checksum,createHash('sha256').update(await fs.readFile(backup.path)).digest('hex'));
    assert.equal((await fs.stat(backup.path)).mode & 0o077,0);
    assert.equal((await fs.stat(`${backup.path}.json`)).mode & 0o077,0);
  });
  it('rejects overlapping operations and always releases the maintenance gate',async()=>{
    let release; const waiting = new Promise(resolve=>{release=resolve;});
    const first = withDatabaseMaintenance(()=>waiting);
    await assert.rejects(performBackup('manual'),/already active/);
    release(); await first; assert.equal(isDatabaseUnavailable(),false);
  });
  it('rejects corrupt or missing snapshots without changing current data',async()=>{
    const backup = await performBackup('manual');
    await fs.appendFile(backup.path,'corrupt');
    await assert.rejects(restoreSnapshot(backup.id),/checksum/);
    assert.ok(await User.findByPk(student.id)); assert.equal(isDatabaseUnavailable(),false);
    await fs.rm(backup.path); await assert.rejects(restoreSnapshot(backup.id));
    assert.ok(await User.findByPk(student.id));
  });
  it('restores atomically, retains the external catalog and revokes all restored sessions',async()=>{
    const session = await createAuthSession(admin);
    const backup = await performBackup('manual');
    await student.update({firstName:'Changed'});
    await restoreSnapshot(backup.id);
    assert.equal((await User.findByPk(student.id)).firstName,'Test');
    assert.ok((await AuthSession.findByPk(session.session.id)).revokedAt);
    assert.ok(await Backup.count()>1); await assertDatabaseReady();
    assert.equal(isDatabaseUnavailable(),false);
  });
  it('rolls back to the safety snapshot if a post-restore step fails',async()=>{
    const backup = await performBackup('manual');
    await student.reload(); await student.update({firstName:'Keep current'});
    const original = AuthSession.update.bind(AuthSession);
    let fail = true;
    const replacement = mock.method(AuthSession,'update',async(...args)=>{ if(fail){fail=false;throw new Error('Injected post-restore failure');}return original(...args);});
    try {await assert.rejects(restoreSnapshot(backup.id),/Injected/);}finally{replacement.mock.restore();}
    assert.equal((await User.findByPk(student.id)).firstName,'Keep current');
    await assertDatabaseReady();assert.equal(isDatabaseUnavailable(),false);
  });
  it('resets only settings while preserving account, course, category and study data',async()=>{
    await Settings.create({key:'test_setting',value:'keep',type:'string',category:'general'});
    const result=await resetApplicationData('settings_only');
    assert.equal(await Settings.count(),0);assert.ok(await Backup.findByPk(result.safetyBackupId));
    assert.ok(await User.findByPk(student.id));assert.equal(await Course.count(),1);assert.equal(await Category.count(),1);
  });
  it('rolls back every deletion if a reset fails midway',async()=>{
    const replacement=mock.method(Settings,'destroy',async()=>{throw new Error('Injected reset failure');});
    try{await assert.rejects(resetApplicationData('all'),/Injected/);}finally{replacement.mock.restore();}
    assert.ok(await User.findByPk(student.id));assert.equal(await Course.count(),1);assert.equal(await Category.count(),1);assert.equal(isDatabaseUnavailable(),false);
  });
  it('uses elapsed intervals across month boundaries and reads changed schedule settings',async()=>{
    assert.equal(isBackupDue(new Date('2026-04-30T03:00:00Z'),5,new Date('2026-05-04T03:00:00Z')),false);
    assert.equal(isBackupDue(new Date('2026-04-30T03:00:00Z'),5,new Date('2026-05-05T03:00:00Z')),true);
    await Settings.create({key:'backup_interval',value:'7',type:'string',category:'backup'});
    assert.equal(await runScheduledBackup(),true); assert.equal(await runScheduledBackup(),false);
    await Settings.update({value:'1'},{where:{key:'backup_interval'}});
    assert.equal(await runScheduledBackup(new Date(Date.now()+2*86400000)),true);
  });
  it('resets all application data transactionally but preserves administrator accounts and safety backups',async()=>{
    await resetApplicationData('all');
    assert.equal(await User.count(),1);assert.ok(await User.findByPk(admin.id));assert.equal(await Course.count(),0);assert.equal(await Category.count(),0);assert.ok(await Backup.count()>0);
  });
});
