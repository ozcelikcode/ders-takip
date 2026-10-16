const { it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { dayBounds, wallTimeToInstant, dateKeyInZone, calendarViewDate, calendarViewInstant } = require('../dist/cjs');

it('builds local half-open day bounds including 23-hour and 25-hour DST days', () => {
  const istanbul = dayBounds('2026-10-16', 'Europe/Istanbul'); assert.equal(istanbul.start.toISOString(), '2026-10-15T21:00:00.000Z');
  for (const [date, hours] of [['2026-03-08', 23], ['2026-11-01', 25]]) { const bounds = dayBounds(date, 'America/New_York'); assert.equal((bounds.end - bounds.start) / 3600000, hours); }
  assert.equal(dateKeyInZone('2026-10-15T21:30:00Z', 'Europe/Istanbul'), '2026-10-16');
});
it('rejects missing or ambiguous wall times instead of silently choosing another instant', () => {
  for (const [date, time] of [['2026-03-08', '02:30'], ['2026-11-01', '01:30']]) assert.throws(() => wallTimeToInstant(date, time, 'America/New_York'));
  assert.equal(wallTimeToInstant('2026-10-16', '00:30', 'Europe/Istanbul').toISOString(), '2026-10-15T21:30:00.000Z');
});
it('keeps API boundaries and calendar fields independent of the server or browser timezone', () => {
  const script = `const c=require('./dist/cjs');const v=c.calendarViewDate('2026-03-08T02:30:00Z','UTC');console.log(JSON.stringify([c.dayBounds('2026-10-16','Europe/Istanbul'),v.getHours(),c.calendarViewInstant(v,'UTC').toISOString()]));`;
  const results = ['UTC', 'Europe/Istanbul', 'America/New_York'].map(TZ => execFileSync(process.execPath, ['-e', script], { cwd: process.cwd(), env: { ...process.env, TZ }, encoding: 'utf8' }).trim());
  assert.equal(new Set(results).size, 1);
  const view = calendarViewDate('2026-10-15T21:30:00Z', 'Europe/Istanbul'); assert.equal(view.getDate(), 16); assert.equal(view.getHours(), 0);
  assert.equal(calendarViewInstant(view, 'Europe/Istanbul').toISOString(), '2026-10-15T21:30:00.000Z');
  const precise = calendarViewDate('2026-10-15T21:30:42.123Z', 'Europe/Istanbul');
  assert.equal(calendarViewInstant(precise, 'Europe/Istanbul').toISOString(), '2026-10-15T21:30:42.123Z');
});
