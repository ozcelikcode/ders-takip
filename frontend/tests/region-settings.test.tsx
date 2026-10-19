import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultPreferences, type UserPreferences } from '@study-tracker/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TimezoneNotice from '../src/components/common/TimezoneNotice';
import RegionTab from '../src/pages/settings/RegionTab';
import { useAuthStore } from '../src/store/authStore';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

const browserZone = (timeZone: string) =>
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat().resolvedOptions(),
    timeZone,
  });
const preferences = (patch: Partial<UserPreferences> = {}) => ({ ...defaultPreferences, ...patch });

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: { id: '7' } as never });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('offers the browser time zone once and remembers dismissal per account and zone', async () => {
  browserZone('America/New_York');
  const updatePreferences = vi.fn().mockResolvedValue(undefined);
  useUserPreferencesStore.setState({ preferences: preferences({ timezone: 'Europe/Istanbul' }), updatePreferences });
  render(<TimezoneNotice />);
  fireEvent.click(screen.getByRole('button', { name: 'America/New_York kullan' }));
  await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ timezone: 'America/New_York' }));
  fireEvent.click(screen.getByRole('button', { name: 'Böyle kalsın' }));
  expect(screen.queryByRole('region', { name: 'Saat dilimi önerisi' })).toBeNull();
  cleanup();
  render(<TimezoneNotice />);
  expect(screen.queryByRole('region', { name: 'Saat dilimi önerisi' })).toBeNull();
});

it('stays hidden when the saved zone already matches the browser', () => {
  browserZone('Europe/Istanbul');
  useUserPreferencesStore.setState({ preferences: preferences({ timezone: 'Europe/Istanbul' }) });
  render(<TimezoneNotice />);
  expect(screen.queryByRole('region', { name: 'Saat dilimi önerisi' })).toBeNull();
});

it('saves the time zone and week start, treating a missing week start as Monday', () => {
  browserZone('Asia/Tokyo');
  const onSave = vi.fn();
  const stored = preferences({ timezone: 'Europe/Istanbul' });
  delete (stored as Partial<UserPreferences>).weekStartsOn;
  render(<RegionTab preferences={stored} onSave={onSave} />);
  expect(screen.getByRole('button', { name: 'Pazartesi' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Pazar' }));
  expect(onSave).toHaveBeenCalledWith({ weekStartsOn: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Bunu kullan' }));
  expect(onSave).toHaveBeenCalledWith({ timezone: 'Asia/Tokyo' });
  fireEvent.change(screen.getByLabelText('Saat dilimi'), { target: { value: 'UTC' } });
  expect(onSave).toHaveBeenCalledWith({ timezone: 'UTC' });
});
