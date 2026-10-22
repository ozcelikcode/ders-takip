import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DailyStudyChart from '../src/components/charts/DailyStudyChart';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('gives assistive technology a table of the days instead of the drawing', () => {
  const { container } = render(
    <DailyStudyChart
      days={[
        { date: '2026-10-19', studySeconds: 0 },
        { date: '2026-10-20', studySeconds: 90 * 60 },
      ]}
      dailyGoal={1.5}
    />,
  );
  const table = screen.getByRole('table', { name: 'Günlük ölçülen çalışma; günlük hedef 1 sa 30 dk' });
  const rows = within(table).getAllByRole('row').slice(1);
  expect(rows.map((row) => row.textContent)).toEqual(['Pazartesi, 19 EkiÇalışma yok', 'Salı, 20 Eki1 sa 30 dk']);
  expect(container.querySelector('[role="application"]')).toBeNull();
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
});

it('leaves the goal out of the caption when there is none', () => {
  render(<DailyStudyChart days={[{ date: '2026-10-20', studySeconds: 600 }]} dailyGoal={0} />);
  expect(screen.getByRole('table', { name: 'Günlük ölçülen çalışma' })).toBeTruthy();
});
