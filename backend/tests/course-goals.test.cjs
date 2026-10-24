const { after, before, it } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const request = require('supertest');

const directory = mkdtempSync(path.join(tmpdir(), 'study-tracker-goals-'));
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), DB_PATH: path.join(directory, 'test.sqlite'), BACKUP_DIR: path.join(directory, 'backups') });
const app = require('../dist/app').default;
const { sequelize } = require('../dist/config/database');
const { applyMigrations } = require('../dist/database/migrations');
const { User, Category, Course, CourseGoal } = require('../dist/models');
const { createAuthSession } = require('../dist/services/authSessions');

const auth = (method, url, user) => request(app)[method](url).set('X-Requested-With', 'StudyTracker').auth(user.token, { type: 'bearer' });
let owner, other, sharedCourse, privateCourse, foreignCourse;

before(async () => {
  await applyMigrations();
  for (const name of ['owner', 'other']) {
    const user = await User.create({ username: name, email: `${name}@example.com`, password: 'fixture-password', firstName: 'Test', lastName: 'User', role: 'student' });
    user.token = (await createAuthSession(user)).tokens.accessToken;
    if (name === 'owner') owner = user; else other = user;
  }
  const category = await Category.create({ name: 'Fixture category', order: 1 });
  sharedCourse = await Course.create({ name: 'Shared course', order: 1, categoryId: category.id, isGlobal: true });
  privateCourse = await Course.create({ name: 'Private course', order: 2, categoryId: category.id, isGlobal: false, userId: owner.id });
  foreignCourse = await Course.create({ name: 'Foreign course', order: 3, categoryId: category.id, isGlobal: false, userId: other.id });
});
after(async () => { await sequelize.close(); rmSync(directory, { recursive: true, force: true }); });

it('keeps a weekly goal per person, also on shared records, without touching the record', async () => {
  await auth('put', `/api/course-goals/${sharedCourse.id}`, owner).send({ weeklyMinutes: 300 }).expect(200);
  await auth('put', `/api/course-goals/${privateCourse.id}`, owner).send({ weeklyMinutes: 90 }).expect(200);
  const changed = (await auth('put', `/api/course-goals/${sharedCourse.id}`, owner).send({ weeklyMinutes: 420 }).expect(200)).body.data.goal;
  assert.deepEqual(changed, { courseId: sharedCourse.id, weeklyMinutes: 420 });
  assert.deepEqual((await auth('get', '/api/course-goals', owner).expect(200)).body.data.goals, [
    { courseId: sharedCourse.id, weeklyMinutes: 420 },
    { courseId: privateCourse.id, weeklyMinutes: 90 },
  ]);
  assert.deepEqual((await auth('get', '/api/course-goals', other).expect(200)).body.data.goals, []);
  assert.equal((await Course.findByPk(sharedCourse.id)).updatedAt.getTime(), sharedCourse.updatedAt.getTime());
  await auth('delete', `/api/course-goals/${privateCourse.id}`, owner).expect(200);
  assert.deepEqual((await auth('get', '/api/course-goals', owner).expect(200)).body.data.goals.map((goal) => goal.courseId), [sharedCourse.id]);
  const exported = (await auth('get', '/api/auth/account/export', owner).expect(200)).body;
  assert.deepEqual(exported.courseGoals.map((goal) => [goal.courseId, goal.weeklyMinutes]), [[sharedCourse.id, 420]]);
});

it('refuses records the person cannot see and goals outside one week', async () => {
  await auth('put', `/api/course-goals/${foreignCourse.id}`, owner).send({ weeklyMinutes: 60 }).expect(404);
  await auth('put', '/api/course-goals/999999', owner).send({ weeklyMinutes: 60 }).expect(404);
  for (const weeklyMinutes of [0, -5, 10081, 30.5, '60']) {
    await auth('put', `/api/course-goals/${sharedCourse.id}`, owner).send({ weeklyMinutes }).expect(400);
  }
  await auth('put', `/api/course-goals/${sharedCourse.id}`, owner).send({ weeklyMinutes: 10080 }).expect(200);
  assert.equal(await CourseGoal.count({ where: { courseId: foreignCourse.id } }), 0);
});

it('drops goals with their record and their account', async () => {
  const temporary = await Course.create({ name: 'Temporary course', order: 4, categoryId: sharedCourse.categoryId, isGlobal: false, userId: owner.id });
  await auth('put', `/api/course-goals/${temporary.id}`, owner).send({ weeklyMinutes: 60 }).expect(200);
  await temporary.destroy();
  assert.equal(await CourseGoal.count({ where: { courseId: temporary.id } }), 0);
  await auth('put', `/api/course-goals/${sharedCourse.id}`, other).send({ weeklyMinutes: 30 }).expect(200);
  await other.destroy();
  assert.equal(await CourseGoal.count({ where: { userId: other.id } }), 0);
});
