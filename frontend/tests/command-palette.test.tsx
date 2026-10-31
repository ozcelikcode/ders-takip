import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CommandPalette from '../src/components/common/CommandPalette';
import { usePaletteShortcut } from '../src/hooks/usePaletteShortcut';
import { useAuthStore } from '../src/store/authStore';

function Address() {
  const location = useLocation();
  return <p data-testid="address">{location.pathname + location.search}</p>;
}
function Harness({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  usePaletteShortcut(open, setOpen);
  return (
    <>
      {open && <CommandPalette onClose={() => setOpen(false)} />}
      <Address />
      {children}
    </>
  );
}
const mount = (children?: React.ReactNode) => render(<MemoryRouter initialEntries={['/dashboard']}><Harness>{children}</Harness></MemoryRouter>);
const press = (init: KeyboardEventInit) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true, ...init })); });
const search = (query: string) => fireEvent.change(screen.getByRole('combobox', { name: 'Sayfa ya da ayar ara' }), { target: { value: query } });
const options = () => screen.getAllByRole('option').map((option) => option.textContent);

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  useAuthStore.setState({ user: { id: '1', role: 'student' } as never });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('opens with Ctrl+K and goes to the chosen settings tab with Enter', async () => {
  mount();
  expect(screen.queryByRole('dialog')).toBeNull();
  press({ ctrlKey: true });
  expect(await screen.findByRole('dialog', { name: 'Sayfaya git' })).toBeTruthy();
  search('takv');
  expect(options()).toEqual(['TakvimAyarlar', '"takv" için kayıtlarda araArama']);
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('/settings?tab=calendar'));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('matches without regard to case or Turkish letters and lists administration only for administrators', async () => {
  mount();
  press({ metaKey: true });
  search('ISTATIS');
  expect(options()).toEqual(['İstatistiklerÇalışma alanı', '"ISTATIS" için kayıtlarda araArama']);
  search('yedek');
  expect(options()).toEqual(['"yedek" için kayıtlarda araArama']);
  expect(screen.getByText('Eşleşen sayfa yok.')).toBeTruthy();
  // One Escape closes the palette even with text in the field.
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

  act(() => useAuthStore.setState({ user: { id: '1', role: 'admin' } as never }));
  press({ ctrlKey: true });
  search('yedek');
  expect(options()).toEqual(['Yedekleme ve sıfırlamaSite ayarları', '"yedek" için kayıtlarda araArama']);
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('/admin/settings?section=backup'));
});

it('stays shut while another dialog is open, so an open form is never left behind', () => {
  mount(<div role="dialog" aria-label="Seansı düzenle" />);
  press({ ctrlKey: true });
  expect(screen.queryByRole('dialog', { name: 'Sayfaya git' })).toBeNull();
  press({ key: 'k' });
  expect(screen.queryByRole('dialog', { name: 'Sayfaya git' })).toBeNull();
});

it('sends a typed word to the record search when no page is wanted', async () => {
  mount();
  press({ ctrlKey: true });
  search('a');
  expect(screen.queryByText(/için kayıtlarda ara/)).toBeNull();
  search('gitar dersi');
  expect(options()).toEqual(['"gitar dersi" için kayıtlarda araArama']);
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('/search?q=gitar%20dersi'));
});
