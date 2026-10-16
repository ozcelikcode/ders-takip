import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = { isOpen: true, title: 'Confirm operation', message: 'Fixture' };
it('waits for the server and blocks duplicate confirmation and dismissal while pending', async () => {
  let finish!: (value: boolean) => void;
  const onConfirm = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  const onClose = vi.fn();
  render(<ConfirmDialog {...props} onConfirm={onConfirm} onClose={onClose} />);
  const button = screen.getByRole('button', { name: 'Onayla' });
  act(() => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish(true));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
it('retains the dialog after a rejected operation and allows an explicit retry', async () => {
  const onClose = vi.fn();
  const onConfirm = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  render(<ConfirmDialog {...props} onConfirm={onConfirm} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Onayla' }).hasAttribute('disabled'),
    ).toBe(false),
  );
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
it('shows an unexpected operation failure without dismissing the dialog', async () => {
  const onClose = vi.fn();
  render(
    <ConfirmDialog
      {...props}
      onConfirm={async () => {
        throw new Error('Fixture failure');
      }}
      onClose={onClose}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();
});
