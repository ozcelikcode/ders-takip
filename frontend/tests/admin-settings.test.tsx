import {
  defaultSiteSettings,
  siteSettingsSchema,
} from '@study-tracker/contracts';

// These tests read the education vocabulary; the settings payload must carry that preset.
const educationSettings = { ...defaultSiteSettings, terminologyPreset: 'education' as const };
import { HttpError } from '../src/services/httpError';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { settingsAPI, backupAPI } from '../src/services/api';
import { useSettingsStore } from '../src/store/settingsStore';
import AdminSettingsPage from '../src/pages/admin/AdminSettingsPage';
import type { BackupRecord } from '../src/types/backup';
import { accountQueryKeys } from '../src/lib/queryKeys';
const auth = vi.hoisted(() => ({
  epoch: 1,
  user: { id: '1', role: 'admin' },
  logout: vi.fn(),
}));
vi.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(() => auth, { getState: () => auth }),
}));
vi.mock('../src/store/userPreferencesStore', () => ({
  useUserPreferencesStore: (
    selector: (state: { preferences: { timezone: string } }) => unknown,
  ) => selector({ preferences: { timezone: 'Europe/Istanbul' } }),
}));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return {
    useAccountQueryKeys: () =>
      accountQueryKeys(auth.user.id, 'Europe/Istanbul'),
  };
});
vi.mock('../src/services/api', () => ({
  settingsAPI: {
    getSettings: vi.fn(),
    getAdminSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  backupAPI: {
    getBackups: vi.fn(),
    createBackup: vi.fn(),
    restoreBackup: vi.fn(),
    resetData: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
function response<T>(data: T) {
  return {
    data: { success: true, data },
    status: 200,
    
    
    config: { url: '' },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
const denied = () =>
  new HttpError('Conflict', {
    status: 409,
    data: {
      success: false,
      error: { message: 'Başka bir bakım işlemi sürüyor' },
    },
  });
const backup: BackupRecord = {
  id: 7,
  filename: 'fixture.sqlite',
  size: 1024 * 1024,
  type: 'manual',
  createdAt: '2026-10-16T09:00:00Z',
  verified: true,
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AdminSettingsPage />
      </QueryClientProvider>,
    ),
  };
}
async function ready() {
  await screen.findByLabelText('Site adı');
}
async function backups() {
  await ready();
  fireEvent.click(
    screen.getByRole('button', { name: 'Yedekleme ve sıfırlama' }),
  );
  await screen.findByText('Doğrulanmış');
}
const save = () =>
  fireEvent.submit(screen.getByRole('form', { name: 'Site ayarları formu' }));
beforeEach(() => {
  auth.epoch = 1;
  auth.user = { id: '1', role: 'admin' };
  useSettingsStore.getState().clearAdminSettings();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(settingsAPI.getAdminSettings).mockResolvedValue(
    response({ ...educationSettings }),
  );
  vi.mocked(settingsAPI.updateSettings).mockImplementation(async (patch) =>
    response(siteSettingsSchema.parse({ ...educationSettings, ...patch })),
  );
  vi.mocked(backupAPI.getBackups).mockResolvedValue(response([backup]));
  vi.mocked(backupAPI.resetData).mockResolvedValue(
    response({ safetyBackupId: 8 }),
  );
  vi.mocked(backupAPI.restoreBackup).mockResolvedValue(response(undefined));
  vi.mocked(backupAPI.createBackup).mockResolvedValue(response(undefined));
});
afterEach(() => {
  cleanup();
  useSettingsStore.getState().clearAdminSettings();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
it('does not load private settings or backups for a student', () => {
  auth.user.role = 'student';
  mount();
  expect(settingsAPI.getAdminSettings).not.toHaveBeenCalled();
  expect(backupAPI.getBackups).not.toHaveBeenCalled();
});
it('shows initial settings failure and retries instead of editing defaults', async () => {
  vi.mocked(settingsAPI.getAdminSettings).mockRejectedValueOnce(
    new Error('Offline'),
  );
  mount();
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('Site adı')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Ayarları tekrar yükle' }),
  );
  await ready();
});
it('does not write an unchanged form and preserves a draft during refetch', async () => {
  mount();
  await ready();
  save();
  expect(settingsAPI.updateSettings).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: ' Taslak adı ' },
  });
  vi.mocked(settingsAPI.getAdminSettings).mockResolvedValue(
    response({
      ...educationSettings,
      adminEmail: 'remote@example.com',
      siteName: 'Remote name',
    }),
  );
  await act(() => useSettingsStore.getState().fetchAdminSettings());
  expect((screen.getByLabelText('Site adı') as HTMLInputElement).value).toBe(
    ' Taslak adı ',
  );
  save();
  await waitFor(() =>
    expect(settingsAPI.updateSettings).toHaveBeenCalledWith({
      siteName: 'Taslak adı',
    }),
  );
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Değişiklikleri kaydet',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  );
});
it('can discard a draft explicitly to the latest server settings', async () => {
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: 'Draft' },
  });
  act(() =>
    useSettingsStore.setState({
      adminSettings: { ...educationSettings, siteName: 'Latest' },
    }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Değişikliklerden vazgeç' }),
  );
  expect((screen.getByLabelText('Site adı') as HTMLInputElement).value).toBe(
    'Latest',
  );
  expect(settingsAPI.updateSettings).not.toHaveBeenCalled();
});
it('validates hidden section fields and keeps the draft on a rejected save for retry', async () => {
  vi.mocked(settingsAPI.updateSettings)
    .mockRejectedValueOnce(denied())
    .mockResolvedValue(response({ ...educationSettings, siteName: 'Valid' }));
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText('Site URL'), {
    target: { value: 'bad' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Güvenlik' }));
  save();
  expect(settingsAPI.updateSettings).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toContain('Site URL');
  fireEvent.click(screen.getByRole('button', { name: 'Genel' }));
  fireEvent.change(screen.getByLabelText('Site URL'), {
    target: { value: defaultSiteSettings.siteUrl },
  });
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: 'Valid' },
  });
  save();
  await screen.findByText('Başka bir bakım işlemi sürüyor');
  expect((screen.getByLabelText('Site adı') as HTMLInputElement).value).toBe(
    'Valid',
  );
  save();
  await waitFor(() =>
    expect(settingsAPI.updateSettings).toHaveBeenCalledTimes(2),
  );
});
it('locks form sections and duplicate writes until acknowledgement', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof settingsAPI.updateSettings>>>();
  vi.mocked(settingsAPI.updateSettings).mockReturnValue(pending.promise);
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: 'Saved' },
  });
  act(() => {
    save();
    save();
  });
  expect(settingsAPI.updateSettings).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Site adı').matches(':disabled')).toBe(true);
  expect(
    (
      screen.getByRole('button', {
        name: 'Yedekleme ve sıfırlama',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await act(() =>
    pending.resolve(response({ ...educationSettings, siteName: 'Saved' })),
  );
  await screen.findByText('Kaydedilmemiş değişiklik yok.');
});
it('distinguishes backup read errors from an empty catalog and supports retry', async () => {
  vi.mocked(backupAPI.getBackups)
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(response([]));
  mount();
  await ready();
  fireEvent.click(
    screen.getByRole('button', { name: 'Yedekleme ve sıfırlama' }),
  );
  await screen.findByText('Yedekler yüklenemedi.');
  expect(screen.queryByText('Henüz yedek bulunmuyor.')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Yedekleri tekrar yükle' }),
  );
  await screen.findByText('Henüz yedek bulunmuyor.');
});
it('only enables explicitly verified restore records and blocks maintenance while a settings draft is dirty', async () => {
  const unknown = { ...backup, id: 9 };
  delete unknown.verified;
  vi.mocked(backupAPI.getBackups).mockResolvedValue(
    response([backup, { ...backup, id: 8, verified: false }, unknown]),
  );
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: 'Draft' },
  });
  await backups();
  for (const button of screen.getAllByRole('button', {
    name: /tarihli yedeği geri yükle/,
  }))
    expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(
    (
      screen.getByRole('button', {
        name: 'Yalnızca site ayarlarını sıfırla',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole('button', { name: 'Değişikliklerden vazgeç' }),
  );
  const buttons = screen.getAllByRole('button', {
    name: /tarihli yedeği geri yükle/,
  });
  expect(buttons.map((b) => (b as HTMLButtonElement).disabled)).toEqual([
    false,
    true,
    true,
  ]);
});
it('creates one backup, blocks competing writes, and refreshes only the account backup catalog', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof backupAPI.createBackup>>>();
  vi.mocked(backupAPI.createBackup).mockReturnValue(pending.promise);
  const { client } = mount();
  await backups();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const create = screen.getByRole('button', { name: 'Şimdi yedek al' });
  act(() => {
    fireEvent.click(create);
    fireEvent.click(create);
  });
  expect(backupAPI.createBackup).toHaveBeenCalledTimes(1);
  expect(
    (
      screen.getByRole('button', {
        name: 'Yalnızca site ayarlarını sıfırla',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  await act(() => pending.resolve(response(undefined)));
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: accountQueryKeys('1', '').resource('backups'),
    }),
  );
});
it('keeps a failed restore confirmation open and logs out only after successful acknowledgement', async () => {
  vi.mocked(backupAPI.restoreBackup)
    .mockRejectedValueOnce(denied())
    .mockResolvedValue(response(undefined));
  const { client } = mount();
  await backups();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(
    screen.getByRole('button', { name: /tarihli yedeği geri yükle/ }),
  );
  expect(screen.getByText(/Bütün oturumlar kapanacak/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  await screen.findByText('Başka bir bakım işlemi sürüyor');
  expect(auth.logout).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
  expect(invalidate).not.toHaveBeenCalled();
  expect(backupAPI.restoreBackup).toHaveBeenCalledWith(7);
});
it('waits for reset acknowledgement and locks dismissal and duplicate requests', async () => {
  const pending = deferred<Awaited<ReturnType<typeof backupAPI.resetData>>>();
  vi.mocked(backupAPI.resetData).mockReturnValue(pending.promise);
  const { client } = mount();
  await backups();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(
    screen.getByRole('button', { name: 'Yalnızca site ayarlarını sıfırla' }),
  );
  expect(
    screen.getByText(/Hesaplar, dersler, konular ve çalışma geçmişi korunacak/),
  ).toBeTruthy();
  const confirm = screen.getByRole('button', { name: 'Sıfırlamayı uygula' });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  expect(backupAPI.resetData).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  await act(() => pending.resolve(response({ safetyBackupId: 8 })));
  await screen.findByLabelText('Site adı');
  expect(backupAPI.resetData).toHaveBeenCalledWith('settings_only');
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: accountQueryKeys('1', '').resource(),
  });
  expect(auth.logout).not.toHaveBeenCalled();
});
it('shows the full reset scope and lets an administrator cancel without writing', async () => {
  mount();
  await backups();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Kullanıcı ve çalışma verilerini temizle',
    }),
  );
  expect(screen.getByText(/Kullanıcı hesapları, bütün dersler/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(backupAPI.resetData).not.toHaveBeenCalled();
});
it('does not report success or log out another account after a late restore response', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof backupAPI.restoreBackup>>>();
  vi.mocked(backupAPI.restoreBackup).mockReturnValue(pending.promise);
  mount();
  await backups();
  fireEvent.click(
    screen.getByRole('button', { name: /tarihli yedeği geri yükle/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  auth.epoch++;
  await act(() => pending.resolve(response(undefined)));
  expect(auth.logout).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('does not refresh account resources or report success for an unmounted backup response', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof backupAPI.createBackup>>>();
  vi.mocked(backupAPI.createBackup).mockReturnValue(pending.promise);
  const { client, unmount } = mount();
  await backups();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Şimdi yedek al' }));
  unmount();
  await act(() => pending.resolve(response(undefined)));
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('retains a failed reset confirmation and displays a read failure after a later successful reset', async () => {
  vi.mocked(backupAPI.resetData)
    .mockRejectedValueOnce(denied())
    .mockResolvedValue(response({ safetyBackupId: 8 }));
  mount();
  await backups();
  fireEvent.click(
    screen.getByRole('button', { name: 'Yalnızca site ayarlarını sıfırla' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sıfırlamayı uygula' }));
  await screen.findByText('Başka bir bakım işlemi sürüyor');
  expect(screen.getByRole('dialog')).toBeTruthy();
  vi.mocked(settingsAPI.getAdminSettings).mockRejectedValueOnce(
    new Error('Read offline'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sıfırlamayı uygula' }));
  await screen.findByText('Yönetim ayarları yüklenemedi');
  expect(screen.queryByLabelText('Site adı')).toBeNull();
  expect(auth.logout).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Ayarları tekrar yükle' }),
  );
  await ready();
});
it('suppresses late settings success and retains the new account boundary', async () => {
  const pending =
    deferred<Awaited<ReturnType<typeof settingsAPI.updateSettings>>>();
  vi.mocked(settingsAPI.updateSettings).mockReturnValue(pending.promise);
  mount();
  await ready();
  fireEvent.change(screen.getByLabelText('Site adı'), {
    target: { value: 'Old draft' },
  });
  save();
  auth.epoch++;
  useSettingsStore.getState().clearAdminSettings();
  await act(() =>
    pending.resolve(
      response({ ...educationSettings, siteName: 'Old draft' }),
    ),
  );
  expect(useSettingsStore.getState().adminSettings).toBeNull();
  expect(toast.success).not.toHaveBeenCalled();
});
it('clears a cancelled action error before confirming a different reset scope', async () => {
  vi.mocked(backupAPI.restoreBackup).mockRejectedValueOnce(denied());
  vi.mocked(backupAPI.resetData).mockRejectedValueOnce(denied());
  mount();
  await backups();
  fireEvent.click(
    screen.getByRole('button', { name: /tarihli yedeği geri yükle/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Yedeği geri yükle' }));
  await screen.findByText('Başka bir bakım işlemi sürüyor');
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'İptal' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Kullanıcı ve çalışma verilerini temizle',
    }),
  );
  expect(screen.queryByText('Başka bir bakım işlemi sürüyor')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Sıfırlamayı uygula' }));
  await screen.findByText('Başka bir bakım işlemi sürüyor');
  expect(backupAPI.resetData).toHaveBeenCalledWith('all');
  expect(screen.getByRole('dialog')).toBeTruthy();
});
it('refreshes untouched settings without overwriting a later edited draft',async()=>{
 mount();await ready();vi.mocked(settingsAPI.getAdminSettings).mockResolvedValue(response({...educationSettings,siteName:'Updated elsewhere'}));await act(()=>useSettingsStore.getState().fetchAdminSettings());expect((screen.getByLabelText('Site adı') as HTMLInputElement).value).toBe('Updated elsewhere');expect((screen.getByRole('button',{name:'Değişiklikleri kaydet'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Site adı'),{target:{value:'Local edit'}});vi.mocked(settingsAPI.getAdminSettings).mockResolvedValue(response({...educationSettings,siteName:'New remote edit'}));await act(()=>useSettingsStore.getState().fetchAdminSettings());expect((screen.getByLabelText('Site adı') as HTMLInputElement).value).toBe('Local edit');
});

it('offers the vocabulary presets and saves only the chosen preset', async () => {
  mount();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Kelimeler' }));
  const group = screen.getByRole('radiogroup', { name: 'Kelime seti' });
  expect(within(group).getAllByRole('radio')).toHaveLength(5);
  expect((within(group).getByRole('radio', { name: /Eğitim/ }) as HTMLInputElement).checked).toBe(true);
  expect(within(group).getByText('Örnek: Hedef → Adım · Seans')).toBeTruthy();
  fireEvent.click(within(group).getByRole('radio', { name: /Hedef/ }));
  save();
  await waitFor(() =>
    expect(settingsAPI.updateSettings).toHaveBeenCalledWith({ terminologyPreset: 'goals' }),
  );
  await waitFor(() => expect(useSettingsStore.getState().settings.terminologyPreset).toBe('goals'));
});

it('lets an administrator write site-wide custom words and refuses ones that do not fit', async () => {
  mount();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Kelimeler' }));
  fireEvent.click(screen.getByRole('radio', { name: /Özel kelimeler/ }));
  const word = screen.getByRole('group', { name: 'Ana kayıt' });
  expect((within(word).getByLabelText('Kelime') as HTMLInputElement).value).toBe('ders');
  fireEvent.change(within(word).getByLabelText('Kelime'), { target: { value: 'Kitap' } });
  expect((within(word).getByLabelText('"-ı" hâli') as HTMLInputElement).value).toBe('kitapı');
  fireEvent.change(within(word).getByLabelText('"-ı" hâli'), { target: { value: 'kitapa' } });
  expect(within(word).getByText(/bu kelimeye uymuyor/)).toBeTruthy();
  save();
  expect(await screen.findByText(/Geçersiz alanlar: Özel kelimeler/)).toBeTruthy();
  expect(settingsAPI.updateSettings).not.toHaveBeenCalled();
  fireEvent.change(within(word).getByLabelText('"-ı" hâli'), { target: { value: 'kitabı' } });
  expect(within(word).getByText('Biçimler: kitap · kitabı · kitaba · kitabın · kitapta · kitaplar')).toBeTruthy();
  save();
  await waitFor(() =>
    expect(settingsAPI.updateSettings).toHaveBeenCalledWith({
      customTerminology: {
        course: { word: 'kitap', accusative: 'kitabı' },
        topic: { word: 'konu', accusative: 'konuyu' },
        session: { word: 'seans', accusative: 'seansı' },
      },
    }),
  );
});
