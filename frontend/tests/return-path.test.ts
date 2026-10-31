import { expect, it } from 'vitest';
import { returnPath } from '../src/lib/returnPath';

it('returns to the requested in-app page after sign-in, with its query and hash', () => {
  expect(returnPath({ from: { pathname: '/settings', search: '?tab=calendar', hash: '#feed' } })).toBe('/settings?tab=calendar#feed');
  expect(returnPath({ from: { pathname: '/planner', search: '', hash: '' } })).toBe('/planner');
});

it('falls back to the dashboard for anything that is not a same-site path', () => {
  for (const state of [null, undefined, {}, { from: null }, { from: { pathname: 42 } }, { from: { pathname: '//evil.example' } }, { from: { pathname: '/\\evil.example' } }, { from: { pathname: 'https://evil.example' } }, { from: { pathname: '/login' } }])
    expect(returnPath(state)).toBe('/dashboard');
  expect(returnPath({ from: { pathname: '/stats', search: 'x=1' } })).toBe('/stats');
});
