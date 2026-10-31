import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePomodoroAlerts } from '../src/hooks/usePomodoroAlerts';

const base = { phaseKey: 'work:1', phaseName: 'Çalışma', timeLeft: '24:59', isRunning: true, title: 'Okuma' };
beforeEach(() => {
  document.title = 'Çalışma Takibi';
  localStorage.clear();
  Object.assign(navigator, { vibrate: vi.fn() });
});
afterEach(() => cleanup());

it('shows the time left in the tab title while running and restores the title afterwards', () => {
  const { rerender, unmount } = renderHook((props) => usePomodoroAlerts(props), { initialProps: base });
  expect(document.title).toBe('24:59 · Çalışma');
  rerender({ ...base, timeLeft: '24:58' });
  expect(document.title).toBe('24:58 · Çalışma');
  rerender({ ...base, isRunning: false });
  expect(document.title).toBe('Çalışma Takibi');
  unmount();
});

it('alerts on a phase change only when this browser opted in, and remembers the choice', () => {
  const { result, rerender } = renderHook((props) => usePomodoroAlerts(props), { initialProps: base });
  rerender({ ...base, phaseKey: 'short_break:1', phaseName: 'Kısa mola' });
  expect(navigator.vibrate).not.toHaveBeenCalled();
  act(() => result.current.setEnabled(true));
  expect(localStorage.getItem('pomodoro-alerts')).toBe('1');
  rerender({ ...base, phaseKey: 'work:2' });
  expect(navigator.vibrate).toHaveBeenCalledWith(200);
  expect(renderHook(() => usePomodoroAlerts(base)).result.current.enabled).toBe(true);
});
