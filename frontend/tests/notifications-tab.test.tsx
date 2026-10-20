import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultNotificationPreferences, defaultPreferences, type NotificationChannels, type UserPreferences } from '@study-tracker/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as push from '../src/lib/push';
import NotificationsTab from '../src/pages/settings/NotificationsTab';
import { notificationsAPI } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

vi.mock('../src/services/api', () => ({ notificationsAPI: { channels: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), test: vi.fn() } }));
vi.mock('../src/lib/push', async (original) => ({
  ...(await original<typeof import('../src/lib/push')>()),
  browserPushState: vi.fn(),
  subscribeBrowser: vi.fn(),
  unsubscribeBrowser: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const channels = (email: boolean, pushEnabled: boolean): NotificationChannels => ({
  email: { configured: email, enabled: email },
  push: { configured: pushEnabled, enabled: pushEnabled, publicKey: pushEnabled ? 'BPublicKey' : null },
});
const mount = (preferences: UserPreferences = defaultPreferences, onSave = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <NotificationsTab preferences={preferences} onSave={onSave} />
    </QueryClientProvider>,
  );
  return onSave;
};

beforeEach(() => {
  useAuthStore.setState({ user: { id: '3', email: 'ada@example.com' } as never });
  vi.mocked(push.browserPushState).mockResolvedValue('off');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('explains when the site has no delivery channel', async () => {
  vi.mocked(notificationsAPI.channels).mockResolvedValue(channels(false, false));
  mount();
  expect(await screen.findByText(/Bu sitede bildirim gönderimi açık değil/)).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
});

it('offers only email choices when push is not set up and saves each choice as a whole', async () => {
  vi.mocked(notificationsAPI.channels).mockResolvedValue(channels(true, false));
  const onSave = mount({ ...defaultPreferences, notifications: { ...defaultNotificationPreferences, dailyPlanEmail: true } });
  await screen.findByRole('heading', { name: 'Seans hatırlatmaları' });
  expect(screen.queryByRole('heading', { name: 'Bu tarayıcı' })).toBeNull();
  expect(screen.queryByLabelText(/Tarayıcı bildirimi ile/)).toBeNull();
  expect((screen.getByLabelText(/Sabah günlük plan/) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByLabelText('E-posta ile'));
  expect(onSave).toHaveBeenLastCalledWith({ notifications: { ...defaultNotificationPreferences, dailyPlanEmail: true, sessionReminderEmail: true } });
  fireEvent.change(screen.getByLabelText('Ne kadar önce'), { target: { value: '30' } });
  expect(onSave).toHaveBeenLastCalledWith({ notifications: { ...defaultNotificationPreferences, dailyPlanEmail: true, reminderLeadMinutes: 30 } });
  fireEvent.click(screen.getByRole('button', { name: 'Deneme e-postası gönder' }));
  await waitFor(() => expect(notificationsAPI.test).toHaveBeenCalledWith({ channel: 'email' }));
});

it('subscribes this browser with the site key and can turn it off again', async () => {
  vi.mocked(notificationsAPI.channels).mockResolvedValue(channels(false, true));
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'k', auth: 'a' } };
  vi.mocked(push.subscribeBrowser).mockResolvedValue(subscription);
  vi.mocked(push.unsubscribeBrowser).mockResolvedValue(subscription.endpoint);
  mount({ ...defaultPreferences, notifications: { ...defaultNotificationPreferences, sessionReminderPush: true } });
  expect(await screen.findByText('Bu tarayıcıda bildirimler kapalı.')).toBeTruthy();
  expect(screen.getByText('Bu tarayıcıda almak için yukarıdan bildirimleri aç.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bu tarayıcıda bildirimleri aç' }));
  expect(await screen.findByText('Bu tarayıcı bildirim alıyor.')).toBeTruthy();
  expect(push.subscribeBrowser).toHaveBeenCalledWith('BPublicKey');
  expect(notificationsAPI.subscribe).toHaveBeenCalledWith(subscription);
  expect(screen.queryByText('Bu tarayıcıda almak için yukarıdan bildirimleri aç.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Bu tarayıcıda kapat' }));
  expect(await screen.findByText('Bu tarayıcıda bildirimler kapalı.')).toBeTruthy();
  expect(notificationsAPI.unsubscribe).toHaveBeenCalledWith(subscription.endpoint);
});

it('says when the browser blocks the site instead of offering a button that cannot work', async () => {
  vi.mocked(notificationsAPI.channels).mockResolvedValue(channels(false, true));
  vi.mocked(push.browserPushState).mockResolvedValue('denied');
  mount();
  expect(await screen.findByText(/tarayıcı ayarlarında engellenmiş/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Bu tarayıcıda bildirimleri aç' })).toBeNull();
});
