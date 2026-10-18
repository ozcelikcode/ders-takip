const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnvironment } = require('../dist/config/environment');
const { spawnSync } = require('node:child_process');

const valid = { JWT_SECRET: 'a'.repeat(64) };

describe('environment validation', () => {
  it('never loads local dotenv configuration in test processes', () => {
    const result = spawnSync(process.execPath, ['-e', `
      require('dotenv').config = () => { throw new Error('Local dotenv was loaded'); };
      const { getEnvironment } = require('./dist/config/environment');
      if (getEnvironment().NODE_ENV !== 'test') process.exitCode = 1;
    `], {
      cwd: require('node:path').resolve(__dirname, '..'),
      env: { NODE_ENV: 'test', JWT_SECRET: 'a'.repeat(64) },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  });
  it('requires a strong signing secret in every environment', () => {
    for (const NODE_ENV of ['development', 'test', 'production']) {
      assert.throws(() => parseEnvironment({ NODE_ENV }));
      assert.throws(() => parseEnvironment({ ...valid, NODE_ENV, JWT_SECRET: 'short' }));
      assert.throws(() => parseEnvironment({ ...valid, NODE_ENV, JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production' }));
    }
  });
  it('validates ports, rate limits, and the allowed browser origin', () => {
    for (const overrides of [{ PORT: '0' }, { PORT: 'NaN' }, { RATE_LIMIT_MAX_REQUESTS: '-1' }, { FRONTEND_URL: 'invalid' }, { FRONTEND_URL: 'ftp://example.test' }, { JWT_EXPIRE: 'invalid' }, { JWT_EXPIRE: '1d' }, { SESSION_TTL_DAYS: '0' }, { SESSION_TTL_DAYS: '31' }, { BCRYPT_SALT_ROUNDS: '4' }, { NODE_ENV: 'production', FRONTEND_URL: 'http://example.com' }]) {
      assert.throws(() => parseEnvironment({ ...valid, ...overrides }));
    }
    const config = parseEnvironment({ ...valid, PORT: '5002', FRONTEND_URL: 'https://study.example.test' });
    assert.equal(config.PORT, 5002);
    assert.equal(config.FRONTEND_URL, 'https://study.example.test');
  });
});
