import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import LoadError from './LoadError';

afterEach(cleanup);

it('offers a retry for a failed load, and waits while one is already running', () => {
  const refetch = vi.fn();
  const { rerender } = render(<LoadError message="Could not load" query={{ refetch, isFetching: false }} />);
  expect(screen.getByRole('alert').textContent).toContain('Could not load');
  fireEvent.click(screen.getByRole('button'));
  expect(refetch).toHaveBeenCalledTimes(1);
  rerender(<LoadError message="Could not load" query={{ refetch, isFetching: true }} />);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
});
