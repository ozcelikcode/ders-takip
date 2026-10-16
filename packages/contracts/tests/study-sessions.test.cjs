const { it } = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionSession, reservesSessionTime, createSessionSchema, updateSessionSchema } = require('../dist/cjs');
it('defines every allowed session transition and explicit terminal reopening', () => {
  const allowed = { planned: ['planned', 'in_progress', 'completed', 'cancelled'], in_progress: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'], paused: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'], completed: ['completed', 'planned'], cancelled: ['cancelled', 'planned'] };
  for (const from of Object.keys(allowed)) for (const to of Object.keys(allowed)) assert.equal(canTransitionSession(from, to), allowed[from].includes(to), `${from} -> ${to}`);
  for (const status of Object.keys(allowed)) assert.equal(reservesSessionTime(status), status !== 'cancelled');
});
it('requires explicit instants and versioned writes and rejects client-owned derived fields', () => {
  const input = { title: 'Çalışma', startTime: '2099-01-01T09:00:00+03:00', endTime: '2099-01-01T10:00:00+03:00' };
  assert.equal(createSessionSchema.safeParse(input).success, true);
  for (const patch of [{ duration: 60 }, { status: 'completed' }, { completedAt: input.endTime }, { startTime: '2099-01-01T09:00:00' }]) assert.equal(createSessionSchema.safeParse({ ...input, ...patch }).success, false);
  assert.equal(updateSessionSchema.safeParse({ status: 'paused' }).success, false);
  assert.equal(updateSessionSchema.safeParse({ expectedUpdatedAt: input.startTime, status: 'paused' }).success, true);
  assert.equal(updateSessionSchema.safeParse({ expectedUpdatedAt: input.startTime, courseId: null, topicId: null, planId: null }).success, true);
});
