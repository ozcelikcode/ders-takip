const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const { errorHandler } = require('../dist/middleware/errorHandler');

describe('database error responses', () => {
  for (const [name, error, status] of [
    ['validation', new ValidationError('private validation details'), 400],
    ['duplicate', new UniqueConstraintError({ message: 'private duplicate details', errors: [] }), 409],
    ['reference', new ForeignKeyConstraintError({ message: 'private reference details' }), 409],
  ]) {
    it(`maps ${name} failures to a safe client response`, async () => {
      const app = express();
      app.get('/', (_request, _response, next) => next(error));
      app.use(errorHandler);
      const response = await request(app).get('/').expect(status);
      assert.equal(response.body.success, false);
      assert.ok(!JSON.stringify(response.body).includes('private'));
    });
  }
});
