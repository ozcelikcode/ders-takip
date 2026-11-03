import toast from 'react-hot-toast';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from './httpClient';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

const refuse = () =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, error: { code: 'sessionChanged' } }), { status: 409 })));

it('reports a failed background read once, and leaves a failed write to the screen that made it', async () => {
  refuse();
  await expect(api.put('/study-sessions/1', {})).rejects.toThrow();
  expect(toast.error).not.toHaveBeenCalled();
  await expect(api.get('/study-sessions/2')).rejects.toThrow();
  expect(toast.error).toHaveBeenCalledTimes(1);
});
