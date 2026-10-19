const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { defaultPreferences } = require('@study-tracker/contracts');
const directory = mkdtempSync(path.join(tmpdir(),'study-tracker-preferences-'));
Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:randomBytes(48).toString('hex'),DB_PATH:path.join(directory,'test.sqlite'),BACKUP_DIR:path.join(directory,'backups')});
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Settings } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { migrateStoredPreferences } = require('../dist/database/preferenceMigration');
let owner, other, admin;
const auth = (method,url,user=owner) => request(app)[method](url).set('X-Requested-With','StudyTracker').auth(user.token,{type:'bearer'});
const legacy={theme:'dark',notifications:{email:false,push:true,reminders:false},workGoals:{dailyHours:3,weeklyHours:18},studyField:'SAY',extraField:{preserve:true}};
before(async()=>{
 await applyMigrations();
 for (const role of ['owner','other','admin']) {
  const user=await User.create({username:role,email:`${role}@example.com`,password:'fixture-password',firstName:'Test',lastName:'User',role:role==='admin'?'admin':'student'});
  user.token=(await createAuthSession(user)).tokens.accessToken;
  if(role==='owner')owner=user;else if(role==='other')other=user;else admin=user;
 }
 await sequelize.query('UPDATE users SET preferences=:preferences WHERE id=:id',{replacements:{preferences:JSON.stringify(legacy),id:owner.id}});
 await sequelize.query("DELETE FROM schema_migrations WHERE name='003-user-preferences-v1'");
 await applyMigrations();
});
after(async()=>{await sequelize.close();rmSync(directory,{recursive:true,force:true});});
it('migrates legacy JSON explicitly and preserves source data, identity and password',async()=>{
 const current=await User.findByPk(owner.id);
 assert.equal(current.preferences.dailyStudyGoal,3);assert.equal(current.preferences.weeklyStudyGoal,18);assert.equal(current.preferences.emailNotifications,false);assert.equal(current.preferences.studyField,'SAY');
 assert.deepEqual(current.preferences.legacyPreferences,legacy);assert.ok(await current.comparePassword('fixture-password'));
 await applyMigrations();assert.deepEqual((await User.findByPk(owner.id)).preferences,current.preferences);
 assert.throws(()=>migrateStoredPreferences({schemaVersion:2}),/Invalid/);
});
it('saves every canonical preference and reads the same values through another authenticated request',async()=>{
 const patch={...defaultPreferences,theme:'system',customPrimaryColor:'#aabbcc',weeklyStudyGoal:12,dailyStudyGoal:2,activeStudyDays:[0,2],timezone:'UTC',studyField:'DIL'};
 const saved=await auth('put','/api/auth/profile').send({preferences:patch}).expect(200);
 const read=await auth('get','/api/auth/me').expect(200);
 assert.deepEqual(read.body.data.user.preferences,saved.body.data.user.preferences);
 assert.deepEqual(read.body.data.user.preferences,{schemaVersion:1,...patch});
 assert.equal(read.body.data.user.preferences.legacyPreferences,undefined);assert.equal(saved.body.data.user.password,undefined);
});
it('rejects invalid and obsolete payloads without changing stored preferences',async()=>{
 const before=(await User.findByPk(owner.id)).preferences;
 for(const patch of [{timezone:'invalid'},{theme:'invalid'},{defaultPomodoroDuration:0},{activeStudyDays:[1,1]},{workGoals:{dailyHours:3}},{unrecognized:true}])await auth('put','/api/auth/profile').send({preferences:patch}).expect(400);
 assert.deepEqual((await User.findByPk(owner.id)).preferences,before);
});
it('serializes concurrent partial updates without losing unrelated values or another user preferences',async()=>{
 const otherBefore=(await User.findByPk(other.id)).preferences;
 await Promise.all([auth('put','/api/auth/profile').send({preferences:{theme:'light'}}).expect(200),auth('put','/api/auth/profile').send({preferences:{dailyStudyGoal:7}}).expect(200)]);
 const saved=(await User.findByPk(owner.id)).preferences;assert.equal(saved.theme,'light');assert.equal(saved.dailyStudyGoal,7);assert.deepEqual((await User.findByPk(other.id)).preferences,otherBefore);
});
it('uses the canonical contract on admin edits and never exposes the migration archive',async()=>{
 await auth('put',`/api/users/${owner.id}`,admin).send({preferences:{theme:'invalid'}}).expect(400);
 await Promise.all([auth('put',`/api/users/${owner.id}`,admin).send({preferences:{theme:'dark'}}).expect(200),auth('put','/api/auth/profile',owner).send({preferences:{weeklyStudyGoal:22}}).expect(200)]);
 const read=await auth('get','/api/auth/me').expect(200);
 assert.equal(read.body.data.user.preferences.theme,'dark');assert.equal(read.body.data.user.preferences.weeklyStudyGoal,22);assert.equal(read.body.data.user.preferences.legacyPreferences,undefined);
});
it('rolls back the full migration when a later row has an unsupported preference version',async()=>{
 const ownerBefore=(await User.findByPk(owner.id)).preferences;
 await sequelize.query('UPDATE users SET preferences=:preferences WHERE id=:id',{replacements:{preferences:JSON.stringify(legacy),id:owner.id}});
 await sequelize.query('UPDATE users SET preferences=:preferences WHERE id=:id',{replacements:{preferences:'{"schemaVersion":99}',id:other.id}});
 await sequelize.query("DELETE FROM schema_migrations WHERE name='003-user-preferences-v1'");
 await assert.rejects(applyMigrations());assert.deepEqual((await User.findByPk(owner.id)).preferences,legacy);
 await sequelize.query('UPDATE users SET preferences=:preferences WHERE id=:id',{replacements:{preferences:JSON.stringify(defaultPreferences),id:other.id}});
 await applyMigrations();await User.update({preferences:ownerBefore},{where:{id:owner.id}});
});
it('exposes complete branding publicly and keeps administrator configuration private',async()=>{
 await Settings.create({key:'internalKey',value:'fixture-only',type:'string',category:'security'});
 const branding={siteName:'Yeni Çalışma Alanı',siteDescription:'Yeni açıklama',siteLogo:'https://example.com/logo.svg',siteIcon:'https://example.com/icon.svg'};
 await auth('put','/api/settings',admin).send({...branding,adminEmail:'private@example.com'}).expect(200);
 const publicRead=await request(app).get('/api/settings').expect(200);
 for(const [key,value] of Object.entries(branding))assert.equal(publicRead.body.data[key],value);
 for(const key of ['adminEmail','internalKey','sessionTimeout','backup_interval'])assert.equal(publicRead.body.data[key],undefined);
 await request(app).get('/api/settings/admin').expect(401);await auth('get','/api/settings/admin',owner).expect(403);
 const adminRead=await auth('get','/api/settings/admin',admin).expect(200);assert.equal(adminRead.body.data.adminEmail,'private@example.com');assert.equal(adminRead.body.data.internalKey,undefined);
 await request(app).get('/api/settings/category/security').expect(404);
});
it('serves the terminology preset publicly, validates it, and keeps it when other settings change',async()=>{
 assert.equal((await request(app).get('/api/settings').expect(200)).body.data.terminologyPreset,'general');
 await auth('put','/api/settings',admin).send({terminologyPreset:'education'}).expect(200);
 await auth('put','/api/settings',admin).send({siteName:'Başka ayar'}).expect(200);
 assert.equal((await request(app).get('/api/settings').expect(200)).body.data.terminologyPreset,'education');
 await auth('put','/api/settings',admin).send({terminologyPreset:'astronomy'}).expect(400);
 await auth('put','/api/settings',owner).send({terminologyPreset:'goals'}).expect(403);
 assert.equal((await auth('get','/api/settings/admin',admin).expect(200)).body.data.terminologyPreset,'education');
 await Settings.destroy({where:{key:'terminologyPreset'}});
});
it('validates all settings before writing and denies student updates',async()=>{
 const before=await Settings.findOne({where:{key:'siteName'}});
 await auth('put','/api/settings',owner).send({siteName:'Forbidden'}).expect(403);
 for(const patch of [{siteName:'Valid',unknownField:true},{siteName:'   '},{siteIcon:'javascript:alert(1)'},{backup_interval:'3'}])await auth('put','/api/settings',admin).send(patch).expect(400);
 assert.equal((await Settings.findOne({where:{key:'siteName'}})).value,before.value);
});
it('rolls back settings writes when a later upsert fails without returning internal details',async()=>{
 const before=(await Settings.findOne({where:{key:'siteName'}})).value;
 const original=Settings.upsert;let calls=0;
 Settings.upsert=async function(...args){if(++calls===2)throw new Error('private failure fixture');return original.apply(this,args);};
 try {const result=await auth('put','/api/settings',admin).send({siteName:'Temporary',siteDescription:'Temporary description'}).expect(500);assert.equal(JSON.stringify(result.body).includes('private failure'),false);}
 finally {Settings.upsert=original;}
 assert.equal((await Settings.findOne({where:{key:'siteName'}})).value,before);
});
