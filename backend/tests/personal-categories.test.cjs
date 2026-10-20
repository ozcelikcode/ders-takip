const { before, after, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');
const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-categories-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'fixture.sqlite'), BACKUP_DIR: path.join(directory, 'backups'), FRONTEND_URL: 'http://app.test' });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { Category, Course, User } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');
const { generateAccessToken } = require('../dist/utils/jwt');

let owner, other, admin, shared, personal;
const as = async (user) => {
  user.sessionId ??= (await createAuthSession(user)).session.id;
  return generateAccessToken({ id: String(user.id), sid: user.sessionId });
};
const call = async (method, url, user, body) => {
  const operation = request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(await as(user), { type: 'bearer' });
  return body === undefined ? operation : operation.send(body);
};
const rows = (sql) => sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });

// The schema categories had before migration 008: one table-wide UNIQUE(name), no owner.
const legacyCategories = async () => {
  await sequelize.query('PRAGMA foreign_keys = OFF');
  await sequelize.query('DROP TABLE categories');
  await sequelize.query("CREATE TABLE `categories` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` VARCHAR(100) NOT NULL UNIQUE, `description` TEXT, `color` VARCHAR(7) NOT NULL DEFAULT '#3b82f6', `icon` VARCHAR(50), `order` INTEGER NOT NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)");
  await sequelize.query('CREATE UNIQUE INDEX `categories_name` ON `categories` (`name`)');
  await sequelize.query('PRAGMA foreign_keys = ON');
  await sequelize.query("DELETE FROM schema_migrations WHERE name = '008-personal-categories'");
};

before(async () => {
  await applyMigrations();
  const create = (name, extra = {}) => User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', ...extra });
  owner = await create('owner');
  other = await create('other');
  admin = await create('admin', { role: 'admin' });
  await legacyCategories();
  const now = "'2026-10-01 10:00:00.000 +00:00'";
  await sequelize.query(`INSERT INTO categories (id, name, color, \`order\`, isActive, createdAt, updatedAt) VALUES (3, 'Genel', '#111111', 1, 1, ${now}, ${now}), (9, 'Silinecek', '#222222', 2, 1, ${now}, ${now})`);
  await sequelize.query('DELETE FROM categories WHERE id = 9');
  await Course.create({ name: 'Mevcut', categoryId: 3, userId: owner.id, isGlobal: false, color: '#111111', order: 1 });
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('migration 008 rebuilds a legacy categories table without losing rows, links or the id high-water mark', async () => {
  await applyMigrations();
  const [category] = await rows('SELECT id, name, color, userId FROM categories');
  assert.deepEqual(category, { id: 3, name: 'Genel', color: '#111111', userId: null });
  assert.equal((await Course.findOne({ where: { name: 'Mevcut' } })).categoryId, 3);
  assert.deepEqual(await rows('PRAGMA foreign_key_check'), []);
  assert.equal((await rows("SELECT seq FROM sqlite_sequence WHERE name = 'categories'"))[0].seq, 9);
  assert.deepEqual((await rows('PRAGMA foreign_keys'))[0], { foreign_keys: 1 });
  const indexes = (await rows("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'categories' ORDER BY name")).map(index => index.name);
  assert.deepEqual(indexes, ['categories_is_active', 'categories_name', 'categories_order', 'categories_owner_name', 'categories_shared_name', 'categories_user_id']);
  // Re-running is a no-op once recorded.
  await applyMigrations();
  assert.equal((await rows('SELECT count(*) AS total FROM categories'))[0].total, 1);
  shared = await Category.findByPk(3);
});

it('names are unique among shared categories and per owner, not across owners', async () => {
  personal = await Category.create({ name: 'Projelerim', color: '#333333', order: 2, userId: owner.id });
  await Category.create({ name: 'Projelerim', color: '#333333', order: 2, userId: other.id });
  await assert.rejects(Category.create({ name: 'Projelerim', color: '#333333', order: 3, userId: owner.id }));
  await assert.rejects(Category.create({ name: 'Genel', color: '#333333', order: 3, userId: null }));
});

it('users list shared categories and their own, never another user\'s', async () => {
  const names = async (user) => (await call('get', '/api/categories', user)).body.data.categories.map(category => `${category.name}:${category.userId ?? 'shared'}`);
  assert.deepEqual(await names(owner), ['Genel:shared', `Projelerim:${owner.id}`]);
  assert.deepEqual(await names(other), ['Genel:shared', `Projelerim:${other.id}`]);
  assert.deepEqual(await names(admin), ['Genel:shared']);
});

it('a personal category only holds its owner\'s own records', async () => {
  const course = { name: 'Kişisel', categoryId: personal.id, color: '#333333' };
  assert.equal((await call('post', '/api/courses', owner, course)).status, 201);
  assert.equal((await call('post', '/api/courses', other, course)).status, 404);
  assert.equal((await call('post', '/api/courses', admin, { ...course, isGlobal: true })).status, 404);
  const created = await Course.findOne({ where: { name: 'Kişisel' } });
  // An admin may not turn it shared while it sits in a personal category.
  assert.equal((await call('put', `/api/courses/${created.id}`, admin, { isGlobal: true })).status, 400);
  // Moving the owner's existing course into their personal category is allowed; another user's is not visible.
  const existing = await Course.findOne({ where: { name: 'Mevcut' } });
  assert.equal((await call('put', `/api/courses/${existing.id}`, owner, { categoryId: personal.id })).status, 200);
  const foreign = await Category.findOne({ where: { userId: other.id } });
  assert.equal((await call('put', `/api/courses/${existing.id}`, owner, { categoryId: foreign.id })).status, 404);
});

it('admin category management works on shared categories only', async () => {
  assert.equal((await call('put', `/api/categories/${personal.id}`, admin, { name: 'Değişti' })).status, 404);
  assert.equal((await call('delete', `/api/categories/${personal.id}`, admin, {})).status, 404);
  assert.equal((await call('delete', `/api/categories/${shared.id}`, admin, { migrateToCategoryId: personal.id })).status, 404);
  assert.equal((await Category.findByPk(personal.id)).name, 'Projelerim');
});

it('owners create, rename and delete their own personal categories', async () => {
  const created = await call('post', '/api/categories', other, { name: 'Okuma', color: '#123456' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.category.userId, other.id);
  const id = created.body.data.category.id;
  assert.equal((await call('post', '/api/categories', other, { name: 'Ortak olsun', scope: 'shared' })).status, 403);
  const duplicate = await call('post', '/api/categories', other, { name: 'Okuma' });
  assert.deepEqual([duplicate.status, duplicate.body.error.message], [409, 'Bu adla bir kategorin zaten var']);
  const clash = await call('post', '/api/categories', other, { name: 'Genel' });
  assert.deepEqual([clash.status, clash.body.error.message], [409, 'Bu adla ortak bir kategori zaten var']);
  // Another owner may use the same name.
  assert.equal((await call('post', '/api/categories', owner, { name: 'Okuma' })).status, 201);

  assert.equal((await call('put', `/api/categories/${id}`, other, { name: 'Kitaplar' })).status, 200);
  assert.equal((await call('put', `/api/categories/${id}`, other, { name: 'Projelerim' })).status, 409);
  assert.equal((await call('put', `/api/categories/${id}`, owner, { name: 'Başkası' })).status, 404);
  assert.equal((await call('put', `/api/categories/${shared.id}`, other, { name: 'Başkası' })).status, 403);

  // A populated personal category moves its records only where their owner can see them.
  const course = await Course.create({ name: 'Roman', categoryId: id, userId: other.id, isGlobal: false, color: '#123456', order: 1 });
  const foreign = await Category.findOne({ where: { userId: owner.id, name: 'Okuma' } });
  assert.equal((await call('delete', `/api/categories/${id}`, other, { migrateToCategoryId: foreign.id })).status, 404);
  assert.equal((await call('delete', `/api/categories/${id}`, other, {})).status, 409);
  assert.equal((await call('delete', `/api/categories/${id}`, other, { migrateToCategoryId: shared.id })).status, 200);
  assert.equal((await Course.findByPk(course.id)).categoryId, shared.id);

  // Admins may keep personal categories too, through an explicit scope.
  const adminPersonal = await call('post', '/api/categories', admin, { name: 'Notlarım', scope: 'personal' });
  assert.equal(adminPersonal.body.data.category.userId, admin.id);
});

it('deleting a user removes their personal categories with their private records', async () => {
  const response = await call('delete', `/api/users/${owner.id}`, admin);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(await Category.count({ where: { userId: owner.id } }), 0);
  assert.equal(await Category.count({ where: { id: shared.id } }), 1);
  assert.deepEqual(await rows('PRAGMA foreign_key_check'), []);
});
