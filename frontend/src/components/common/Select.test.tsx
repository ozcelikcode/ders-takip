import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { choose, openOptions, shown } from '../../../tests/choose';
import Select from './Select';

afterEach(cleanup);
const zones = ['Europe/Istanbul', 'UTC', 'Asia/Tokyo'].map((zone) => ({ value: zone, label: zone }));

it('names the control by its label, shows the chosen label and marks the current option', async () => {
  const onChange = vi.fn();
  render(
    <>
      <label htmlFor="speed">Speed</label>
      <Select id="speed" value={2} invalid options={[{ value: 1, label: 'Slow' }, { value: 2, label: 'Fast' }]} onChange={onChange} />
    </>,
  );
  const control = screen.getByLabelText('Speed');
  expect(shown(control)).toBe('Fast');
  expect(control.getAttribute('aria-invalid')).toBe('true');
  expect(await openOptions(control)).toEqual(['Slow', 'Fast']);
  expect(screen.getByRole('option', { name: 'Fast' }).getAttribute('aria-selected')).toBe('true');
  await choose(control, 'Slow');
  expect(onChange).toHaveBeenCalledWith(1);
});

it('chooses from the keyboard and never opens while disabled', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<Select aria-label="Size" value="s" options={[{ value: 's', label: 'Small' }, { value: 'l', label: 'Large' }]} onChange={onChange} />);
  const control = screen.getByRole('button', { name: 'Size' });
  await openOptions(control);
  const list = screen.getByRole('listbox');
  // The list takes focus on the next frame; each key is its own step, as a person types them.
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  await act(async () => {
    fireEvent.keyDown(list, { key: 'ArrowDown' });
  });
  await act(async () => {
    fireEvent.keyDown(list, { key: 'Enter' });
  });
  expect(onChange).toHaveBeenCalledWith('l');
  rerender(<Select aria-label="Size" disabled value="s" options={[{ value: 's', label: 'Small' }]} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Size' }));
  expect(screen.queryByRole('option')).toBeNull();
});

it('filters a long list by typing and says when nothing matches', async () => {
  const onChange = vi.fn();
  render(<Select aria-label="Time zone" searchable value="Europe/Istanbul" options={zones} onChange={onChange} />);
  const input = screen.getByRole('combobox', { name: 'Time zone' });
  expect(shown(input)).toBe('Europe/Istanbul');
  await act(async () => {
    fireEvent.change(input, { target: { value: 'zzz' } });
  });
  expect(screen.getByText('Eşleşme yok')).toBeTruthy();
  await choose(input, 'Asia/Tokyo');
  expect(onChange).toHaveBeenCalledWith('Asia/Tokyo');
});
