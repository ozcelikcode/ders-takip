import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defaultPreferences } from '@study-tracker/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import CalendarTab from '../src/pages/settings/CalendarTab';
import { calendarFeedAPI } from '../src/services/api';
import { useUserPreferencesStore } from '../src/store/userPreferencesStore';

vi.mock('../src/services/api', () => ({ calendarFeedAPI: { status: vi.fn(), create: vi.fn(), remove: vi.fn() } }));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return { useAccountQueryKeys: () => accountQueryKeys('1', 'America/Los_Angeles') };
});

const mount = () =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CalendarTab /></QueryClientProvider>);
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('dates the subscription in the profile time zone, not the browser one', async () => {
  useUserPreferencesStore.setState({ preferences: { ...defaultPreferences, timezone: 'America/Los_Angeles' } });
  // 05:30 UTC on 3 November is still the evening of 2 November in Los Angeles.
  vi.mocked(calendarFeedAPI.status).mockResolvedValue({ active: true, createdAt: '2026-11-03T05:30:00.000Z' } as never);
  mount();
  expect((await screen.findByText(/tarihinden beri açık/)).textContent).toContain('2 Kasım 2026');
});

it('offers a retry when the subscription status cannot be loaded', async () => {
  vi.mocked(calendarFeedAPI.status).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ active: false } as never);
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Tekrar dene' }));
  expect(await screen.findByText(/kapalı/i)).toBeTruthy();
  expect(calendarFeedAPI.status).toHaveBeenCalledTimes(2);
});
