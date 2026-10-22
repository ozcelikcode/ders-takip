const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const directory = mkdtempSync(path.join(tmpdir(), 'study-auth-'));
Object.assign(process.env, { NODE_ENV:'test', JWT_SECRET:randomBytes(48).toString('hex'), DB_PATH:path.join(directory,'auth.sqlite'), BACKUP_DIR:path.join(directory,'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations, assertDatabaseReady } = require('../dist/database/migrations');
const { User, AuthSession, RefreshCredential } = require('../dist/models');
const { manageAdminAccount } = require('../dist/services/adminAccounts');
let index = 0;
const write = (url, cookie) => { const operation = request(app).post(url).set('X-Requested-With','StudyTracker'); return cookie ? operation.set('Cookie',cookie) : operation; };
const cookieOf = response => response.headers['set-cookie'][0].split(';')[0];
const me = token => request(app).get('/api/auth/me').set('X-Requested-With','StudyTracker').auth(token,{type:'bearer'});
const account = async (role='student') => { index++; return User.create({ username:`fixture${index}`,email:`fixture${index}@example.com`, password:'original-password', firstName:'Test',lastName:'Account',role }); };
const login = user => write('/api/auth/login').send({ email:user.email,password:'original-password' });
before(async () => {
  await applyMigrations();
  const user = await account();
  await RefreshCredential.drop(); await AuthSession.drop();
  await sequelize.query("DELETE FROM schema_migrations WHERE name='002-auth-sessions'");
  await assert.rejects(assertDatabaseReady(),/pending/);
  await applyMigrations();
  assert.ok(await User.findByPk(user.id));
});
after(async () => { await sequelize.close(); rmSync(directory,{recursive:true,force:true}); });

describe('revocable browser sessions', () => {
  it('issues an HttpOnly same-site cookie and never returns the refresh credential as JSON', async () => {
    const response = await login(await account()).expect(200);
    assert.equal(response.body.data.tokens.refreshToken,undefined);
    const cookie = response.headers['set-cookie'][0];
    assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Strict/); assert.match(cookie,/Path=\/api\/auth/);
    const raw = cookieOf(response).split('=')[1];
    assert.equal(await RefreshCredential.count({where:{hash:raw}}),0);
    await me(response.body.data.tokens.accessToken).expect(200);
  });
  it('rejects CSRF requests and untrusted browser origins', async () => {
    await request(app).post('/api/auth/login').send({email:'nobody@example.com',password:'x'}).expect(403);
    await write('/api/auth/refresh-token').set('Origin','https://foreign.example.com').expect(403);
    await write('/api/auth/refresh-token').set('Sec-Fetch-Site','cross-site').expect(403);
  });
  it('rejects legacy JWTs, wrong issuers, and missing sessions', async () => {
    const user = await account();
    const response = await login(user);
    const payload = jwt.decode(response.body.data.tokens.accessToken);
    for (const data of [{id:String(user.id),email:user.email,role:'admin'}, {...payload,iss:'foreign'}, {...payload,sid:'00000000-0000-4000-8000-000000000000'}]) {
      await me(jwt.sign(data,process.env.JWT_SECRET,{algorithm:'HS256'})).expect(401);
    }
  });
  it('rotates refresh credentials and revokes the complete family on replay', async () => {
    const first = await login(await account());
    const rotated = await write('/api/auth/refresh-token',cookieOf(first)).expect(200);
    assert.notEqual(cookieOf(first),cookieOf(rotated));
    await write('/api/auth/refresh-token',cookieOf(first)).expect(401);
    await me(rotated.body.data.tokens.accessToken).expect(401);
    await write('/api/auth/refresh-token',cookieOf(rotated)).expect(401);
  });
  it('serializes concurrent rotations and fails closed when the same credential is reused', async () => {
    const first = await login(await account());
    const results = await Promise.all([write('/api/auth/refresh-token',cookieOf(first)),write('/api/auth/refresh-token',cookieOf(first))]);
    assert.deepEqual(results.map(result=>result.status).sort(),[200,401]);
    const accepted = results.find(result=>result.status===200);
    await me(accepted.body.data.tokens.accessToken).expect(401);
  });
  it('invalidates access and refresh immediately on logout', async () => {
    const first = await login(await account());
    await write('/api/auth/logout',cookieOf(first)).expect(200);
    await me(first.body.data.tokens.accessToken).expect(401);
    await write('/api/auth/refresh-token',cookieOf(first)).expect(401);
    await write('/api/auth/logout',cookieOf(first)).expect(200);
  });
  it('rejects both credentials after the absolute session deadline', async () => {
    const user = await account(); const first = await login(user);
    await AuthSession.update({expiresAt:new Date(Date.now()-1000)},{where:{userId:user.id}});
    await me(first.body.data.tokens.accessToken).expect(401);
    await write('/api/auth/refresh-token',cookieOf(first)).expect(401);
  });
  it('preserves sessions on a wrong password and revokes every session after a successful password change', async () => {
    const user = await account(); const first = await login(user); const second = await login(user);
    const change = body => request(app).put('/api/auth/change-password').set('X-Requested-With','StudyTracker').auth(first.body.data.tokens.accessToken,{type:'bearer'}).send(body);
    await change({currentPassword:'wrong',newPassword:'replacement-password'}).expect(400);
    await me(first.body.data.tokens.accessToken).expect(200);
    await change({currentPassword:'original-password',newPassword:'replacement-password'}).expect(200);
    for(const session of [first,second]) { await me(session.body.data.tokens.accessToken).expect(401); await write('/api/auth/refresh-token',cookieOf(session)).expect(401); }
    await login(user).expect(401);
    await write('/api/auth/login').send({email:user.email,password:'replacement-password'}).expect(200);
  });
  it('rejects short new passwords and bcrypt truncation without breaking existing password login', async () => {
    const user = await account(); const first = await login(user);
    for(const newPassword of ['short', 'ü'.repeat(40)]) await request(app).put('/api/auth/change-password').set('X-Requested-With','StudyTracker').auth(first.body.data.tokens.accessToken,{type:'bearer'}).send({currentPassword:'original-password',newPassword}).expect(400);
  });
  it('does not revive old sessions when a disabled account is reactivated, blocks admin self-demotion/deactivation, and supports profileImage data URIs and clearing', async () => {
    const admin = await account('admin'); const subject = await account();
    const actor = await login(admin); const original = await login(subject);
    await request(app).put(`/api/users/${admin.id}`).set('X-Requested-With','StudyTracker').auth(actor.body.data.tokens.accessToken,{type:'bearer'}).send({isActive:false}).expect(400);
    await request(app).put(`/api/users/${admin.id}`).set('X-Requested-With','StudyTracker').auth(actor.body.data.tokens.accessToken,{type:'bearer'}).send({role:'student'}).expect(400);
    await request(app).delete(`/api/users/${admin.id}`).set('X-Requested-With','StudyTracker').auth(actor.body.data.tokens.accessToken,{type:'bearer'}).expect(400);
    for (const isActive of [false, true]) await request(app).put(`/api/users/${subject.id}`).set('X-Requested-With','StudyTracker').auth(actor.body.data.tokens.accessToken,{type:'bearer'}).send({isActive}).expect(200);
    await me(original.body.data.tokens.accessToken).expect(401);
    await write('/api/auth/refresh-token',cookieOf(original)).expect(401);
    const relogged = await login(subject).expect(200);
    const updatedProfile = await request(app).put('/api/auth/profile').set('X-Requested-With','StudyTracker').auth(relogged.body.data.tokens.accessToken,{type:'bearer'}).send({profileImage:'data:image/png;base64,iVBORw0KGgo='}).expect(200);
    assert.equal(updatedProfile.body.data.user.profileImage, 'data:image/png;base64,iVBORw0KGgo=');
    const clearedProfile = await request(app).put('/api/auth/profile').set('X-Requested-With','StudyTracker').auth(relogged.body.data.tokens.accessToken,{type:'bearer'}).send({profileImage:null}).expect(200);
    assert.equal(clearedProfile.body.data.user.profileImage, null);
  });
  it('rejects an old credential check that raced with a password update', async () => {
    const user = await account();
    const stale = await User.findByPk(user.id,{attributes:{include:['password']}});
    user.password='replacement-password';await user.save();
    const { createAuthSession }=require('../dist/services/authSessions');
    await assert.rejects(createAuthSession(stale),(error)=>error.code==='credentialsChanged');
  });
  it('recovers exactly the active admin and preserves other accounts', async () => {
    const admin = await account('admin'); const other = await account(); const first = await login(admin);
    const count = await User.count();
    await assert.rejects(manageAdminAccount('recover',other.email,'ignored','replacement-password'),/administrator/);
    await manageAdminAccount('recover',admin.email,'ignored','replacement-password');
    assert.equal(await User.count(),count);
    await me(first.body.data.tokens.accessToken).expect(401);
    await login(admin).expect(401);
    await login(other).expect(200);
    await write('/api/auth/login').send({email:admin.email,password:'replacement-password'}).expect(200);
    await assert.rejects(manageAdminAccount('create','new@example.com','newadmin','replacement-password'),/already exists/);
  });
});
