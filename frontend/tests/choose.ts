import { act, fireEvent, screen } from '@testing-library/react';

// Helpers for the shared Select (a Headless UI listbox or combobox): its options exist only while it is open.

/** Opens a select and returns the names of its options. */
export async function openOptions(control: HTMLElement) {
  await act(async () => {
    if (control.tagName === 'INPUT') fireEvent.focus(control);
    fireEvent.keyDown(control, { key: 'ArrowDown' });
  });
  return (await screen.findAllByRole('option')).map((option) => option.textContent ?? '');
}

/** Closes an open select without choosing; its button toggles, so Escape never reaches a dialog around it. */
export async function closeOptions(control: HTMLElement) {
  await act(async () => {
    fireEvent.click(control);
  });
}

/** Picks the option with this name; a searchable select is filtered by typing it first. */
export async function choose(control: HTMLElement, name: string | RegExp) {
  if (control.tagName === 'INPUT' && typeof name === 'string')
    await act(async () => {
      fireEvent.change(control, { target: { value: name } });
    });
  else await openOptions(control);
  const option = await screen.findByRole('option', { name });
  // A combobox option takes the whole press, not only the click.
  await act(async () => {
    fireEvent.mouseDown(option);
    fireEvent.mouseUp(option);
    fireEvent.click(option);
  });
}

/** The label a select shows for its current value. */
export const shown = (control: HTMLElement) =>
  control.tagName === 'INPUT' ? (control as HTMLInputElement).value : (control.textContent ?? '').trim();
