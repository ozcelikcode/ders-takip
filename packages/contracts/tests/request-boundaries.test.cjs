const { it } = require('node:test');
const assert = require('node:assert/strict');
const c = require('../dist/cjs');
const registration = {
  username: ' fixture ',
  email: 'fixture@example.com',
  password: 'fixture-password',
  firstName: ' Test ',
  lastName: ' User ',
};
it('normalizes public registration without accepting privilege fields or coercing booleans', () => {
  assert.equal(c.registerSchema.parse(registration).username, 'fixture');
  for (const patch of [
    { role: 'admin' },
    { isActive: true },
    { preferences: {} },
  ])
    assert.equal(
      c.registerSchema.safeParse({ ...registration, ...patch }).success,
      false,
    );
  assert.equal(
    c.loginSchema.safeParse({ email: registration.email, password: 'old' })
      .success,
    true,
  );
  assert.equal(
    c.registerSchema.safeParse({ ...registration, password: 'old' }).success,
    false,
  );
});
it('keeps sparse user patches sparse, including inactive administrator metadata', () => {
  assert.deepEqual(c.managedUserPatchSchema.parse({ firstName: ' Updated ' }), {
    firstName: 'Updated',
  });
  for (const body of [
    {},
    { isActive: 'false' },
    { password: 'new-password' },
    { preferences: null },
    { preferences: { legacy: true } },
  ])
    assert.equal(c.managedUserPatchSchema.safeParse(body).success, false);
});
it('distinguishes clearing an image from absent fields and rejects executable image sources', () => {
  for (const profileImage of [
    null,
    '',
    'https://example.com/photo.png',
    'data:image/png;base64,AA==',
  ])
    assert.equal(
      c.profilePatchSchema.safeParse({ profileImage }).success,
      true,
    );
  for (const profileImage of [
    'javascript:alert(1)',
    'data:text/html;base64,AA==',
    'file:///private/image.png',
  ])
    assert.equal(
      c.profilePatchSchema.safeParse({ profileImage }).success,
      false,
    );
});
it('rejects ambiguous, repeated and unsafe user query parameters', () => {
  assert.deepEqual(c.userListQuerySchema.parse({}), {
    page: '1',
    limit: '10',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  for (const input of [
    { page: '1x' },
    { limit: '201' },
    { page: ['1', '2'] },
    { includeStats: 'yes' },
    { sortBy: 'password' },
    { page: String(Number.MAX_SAFE_INTEGER), limit: '200' },
  ])
    assert.equal(c.userListQuerySchema.safeParse(input).success, false);
});
it('normalizes date-only plan inputs as UTC and rejects fuzzy or reversed dates', () => {
  const input = {
    title: ' Goal ',
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };
  assert.equal(
    c.createPlanSchema.parse(input).startDate,
    '2099-01-01T00:00:00.000Z',
  );
  for (const patch of [
    { startDate: '01/01/2099' },
    { endDate: '2099-01-01' },
    { startDate: '2099-01-01T09:00:00' },
    { startDate: '2099-02-30' },
    { userId: 1 },
  ])
    assert.equal(
      c.createPlanSchema.safeParse({ ...input, ...patch }).success,
      false,
    );
  assert.deepEqual(c.updatePlanSchema.parse({ goals: { dailyHours: 2 } }), {
    goals: { dailyHours: 2 },
  });
});
it('keeps backup reset scopes strict and strips host paths from response DTOs', () => {
  for (const body of [
    {},
    { mode: 'settings_only', extra: true },
    { mode: ['all'] },
    { mode: 'everything' },
  ])
    assert.equal(c.resetDataSchema.safeParse(body).success, false);
  const dto = c.backupRecordSchema.parse({
    id: 1,
    filename: 'fixture.sqlite',
    size: 100,
    type: 'manual',
    createdAt: '2026-10-17T00:00:00Z',
    path: '/private/fixture.sqlite',
  });
  assert.equal('path' in dto, false);
  assert.equal(dto.verified, undefined);
});
it('shares actual elapsed session limits without rounding out-of-range values', () => {
  for (const value of [60000, 90000, 86400000])
    assert.equal(c.isSessionDurationValid(value), true);
  for (const value of [59999, 86400001, NaN, Infinity])
    assert.equal(c.isSessionDurationValid(value), false);
});

it('exposes validation paths and codes without request values or internal Zod structures', () => {
  assert.deepEqual(
    c.validationError([
      { path: ['body', 'password'], message: 'passwordLength', input: 'private-value' },
      { path: ['body', 'email'], message: 'Invalid input: expected string' },
    ]),
    {
      code: 'validation',
      details: [
        { field: 'body.password', code: 'passwordLength' },
        // Zod's own English messages never reach a screen; they become the generic code.
        { field: 'body.email', code: 'invalid' },
      ],
    },
  );
  assert.throws(() => c.fail(409, 'planOverlap'), (error) => error instanceof c.ApiFailure && error.statusCode === 409 && error.code === 'planOverlap');
});
