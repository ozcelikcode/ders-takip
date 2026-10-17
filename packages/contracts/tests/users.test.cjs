const { it } = require('node:test');
const assert = require('node:assert/strict');
const { createManagedUserSchema } = require('../dist/cjs');
const input = { username: 'fixtureuser', email: 'fixture@example.com', password: 'fixture-password', firstName: ' Test ', lastName: ' User ' };
it('shares managed-account defaults and normalization without persisting password confirmation', () => {
  const result = createManagedUserSchema.parse(input);
  assert.equal(result.firstName, 'Test'); assert.equal(result.lastName, 'User'); assert.equal(result.role, 'student'); assert.equal(result.isActive, true);
  assert.equal(createManagedUserSchema.safeParse({ ...input, confirmPassword: input.password }).success, false);
});
it('validates UTF-8 password limits and alphabetic account identifiers consistently', () => {
  assert.equal(createManagedUserSchema.safeParse({ ...input, password: 'ü'.repeat(36) }).success, true);
  assert.equal(createManagedUserSchema.safeParse({ ...input, password: 'ü'.repeat(37) }).success, false);
  for (const patch of [{ username: 'foo-bar' }, { username: 'öğrenci' }, { firstName: ' ' }, { role: 'owner' }, { isActive: 'true' }]) assert.equal(createManagedUserSchema.safeParse({ ...input, ...patch }).success, false);
});
