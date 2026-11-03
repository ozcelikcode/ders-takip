import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PomodoroModal from './PomodoroModal';
import type { StudySession } from '../../types/planner';

vi.mock('./PomodoroTimer', () => ({ default: () => <p>timer</p> }));
afterEach(cleanup);

const session = { id: 1, title: 'Focus' } as StudySession;

it('keeps the page usable while the timer is minimized', () => {
  const { rerender } = render(<PomodoroModal isOpen session={session} onClose={vi.fn()} onToggleMinimize={vi.fn()} />);
  expect(screen.getByRole('dialog')).toBeTruthy();
  rerender(<PomodoroModal isOpen session={session} onClose={vi.fn()} onToggleMinimize={vi.fn()} isMinimized />);
  // A corner panel, not a modal: nothing blocks or dims the planner behind it.
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('region', { name: 'Pomodoro' })).toBeTruthy();
  expect(screen.getByText('timer')).toBeTruthy();
});
