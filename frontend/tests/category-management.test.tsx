import { AxiosError, AxiosHeaders } from 'axios';
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
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { categoriesAPI } from '../src/services/api';
import type { CatalogCategoryRecord } from '../src/types/catalog';
import { accountQueryKeys } from '../src/lib/queryKeys';
import CategoryManagementModal from '../src/components/modals/CategoryManagementModal';

const auth = vi.hoisted(() => ({ epoch: 1, user: { id: '1', role: 'admin' } }));
vi.mock('../src/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: typeof auth) => unknown) => (selector ? selector(auth) : auth),
    { getState: () => auth },
  ),
}));
vi.mock('../src/hooks/useAccountQueryKeys', async () => {
  const { accountQueryKeys } = await import('../src/lib/queryKeys');
  return {
    useAccountQueryKeys: () =>
      accountQueryKeys(auth.user.id, 'Europe/Istanbul'),
  };
});
vi.mock('../src/services/api', () => ({
  categoriesAPI: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const categories: CatalogCategoryRecord[] = [
  {
    id: 1,
    name: 'Eğitim',
    description: 'Common category',
    icon: 'LegacyIcon',
    color: '#123456',
    order: 2,
    isActive: true,
    userId: null,
  },
  {
    id: 2,
    name: 'İş',
    description: null,
    icon: 'Briefcase',
    color: '#52525b',
    userId: null,
    order: 8,
    isActive: false,
  },
];
function response(items = categories) {
  return {
    data: { success: true, data: { categories: items } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}
function rejection(message = 'Hedefte aynı adlı ders var.') {
  return new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
    ...response(),
    status: 409,
    data: { success: false, error: { message } },
  });
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const close = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <CategoryManagementModal isOpen onClose={close} />
    </QueryClientProvider>,
  );
  return { client, close, ...view };
}
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
async function openEditor() {
  await screen.findByRole('button', { name: 'Eğitim kategorisini düzenle' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Eğitim kategorisini düzenle' }),
  );
  return screen.findByRole('dialog', { name: 'Kategoriyi düzenle' });
}
async function openDelete() {
  await screen.findByRole('button', { name: 'Eğitim kategorisini sil' });
  fireEvent.click(
    screen.getByRole('button', { name: 'Eğitim kategorisini sil' }),
  );
  return screen.findByRole('dialog', { name: 'Kategoriyi sil' });
}
beforeEach(() => {
  auth.epoch = 1;
  auth.user = { id: '1', role: 'admin' };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue(response());
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it('distinguishes read failure from an empty catalog and allows a read retry', async () => {
  vi.mocked(categoriesAPI.getCategories).mockRejectedValueOnce(
    new Error('Offline'),
  );
  mount();
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Kategoriler yüklenemedi.',
  );
  expect(screen.queryByText('Henüz ortak kategori eklenmedi.')).toBeNull();
  expect(
    (screen.getByRole('button', { name: 'Kategori ekle' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
  await screen.findByText('Eğitim');
  expect(categoriesAPI.getCategories).toHaveBeenCalledTimes(2);
});
it('searches using Turkish casing and keeps inactive categories available for editing', async () => {
  mount();
  await screen.findByText('Eğitim');
  fireEvent.change(screen.getByLabelText('Kategori ara'), {
    target: { value: 'iş' },
  });
  expect(
    screen.queryByRole('button', { name: 'Eğitim kategorisini düzenle' }),
  ).toBeNull();
  expect(
    screen.getByRole('button', { name: 'İş kategorisini düzenle' }),
  ).toBeTruthy();
  expect(screen.getByText('Pasif')).toBeTruthy();
});
it('validates the shared category contract and creates after the highest order rather than the list length', async () => {
  vi.mocked(categoriesAPI.createCategory).mockResolvedValue(response());
  mount();
  await screen.findByText('Eğitim');
  fireEvent.click(screen.getByRole('button', { name: 'Kategori ekle' }));
  expect((screen.getByLabelText('Sıra') as HTMLInputElement).value).toBe('9');
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: '   ' },
  });
  fireEvent.change(screen.getByLabelText('Sıra'), { target: { value: '1.5' } });
  save();
  expect(categoriesAPI.createCategory).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText('Kategori adı').getAttribute('aria-invalid'),
  ).toBe('true');
  expect(screen.getByLabelText('Sıra').getAttribute('aria-invalid')).toBe(
    'true',
  );
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: ' Projeler ' },
  });
  fireEvent.change(screen.getByLabelText('Sıra'), { target: { value: '9' } });
  save();
  await waitFor(() =>
    expect(categoriesAPI.createCategory).toHaveBeenCalledWith({
      name: 'Projeler',
      description: '',
      color: '#52525b',
      icon: 'Tag',
      order: 9,
      isActive: true,
      scope: 'shared',
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Kategori ekle' })).toBeNull(),
  );
  expect(
    screen.getByRole('dialog', { name: 'Kategori yönetimi' }),
  ).toBeTruthy();
});
it('preserves drafts across refetches, clears descriptions explicitly and sends only changed fields', async () => {
  vi.mocked(categoriesAPI.updateCategory).mockResolvedValue(response());
  const { client } = mount();
  await openEditor();
  expect((screen.getByLabelText('Simge') as HTMLSelectElement).value).toBe(
    'LegacyIcon',
  );
  fireEvent.change(screen.getByLabelText('Açıklama'), {
    target: { value: '' },
  });
  act(() =>
    client.setQueryData(
      accountQueryKeys('1', '').catalog('categories'),
      response([{ ...categories[0]!, name: 'External name' }, categories[1]!]),
    ),
  );
  expect(
    (screen.getByLabelText('Kategori adı') as HTMLInputElement).value,
  ).toBe('Eğitim');
  save();
  await waitFor(() =>
    expect(categoriesAPI.updateCategory).toHaveBeenCalledWith('1', {
      description: '',
    }),
  );
});
it('keeps failed edits open without automatic write retry and invalidates all affected views on success', async () => {
  vi.mocked(categoriesAPI.updateCategory)
    .mockRejectedValueOnce(rejection('Kategori adı zaten var.'))
    .mockResolvedValueOnce(response());
  const { client } = mount();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await openEditor();
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: 'New category' },
  });
  save();
  await screen.findByText('Kategori adı zaten var.');
  expect(categoriesAPI.updateCategory).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByLabelText('Kategori adı') as HTMLInputElement).value,
  ).toBe('New category');
  save();
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Kategoriyi düzenle' }),
    ).toBeNull(),
  );
  const keys = accountQueryKeys('1', 'Europe/Istanbul');
  for (const queryKey of [
    keys.catalog(),
    keys.sessions(),
    keys.resource('topic-progress'),
  ])
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
});
it('blocks repeated writes, Escape and dismissal of nested editors until acknowledgement', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  vi.mocked(categoriesAPI.updateCategory).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { close } = mount();
  await openEditor();
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: 'Updated' },
  });
  act(() => {
    save();
    save();
  });
  expect(categoriesAPI.updateCategory).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  expect(
    screen.getByRole('dialog', { name: 'Kategoriyi düzenle' }),
  ).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  await act(async () => finish(response()));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Kategoriyi düzenle' }),
    ).toBeNull(),
  );
  expect(close).not.toHaveBeenCalled();
});
it('returns focus to the list without closing the manager when an editor is cancelled', async () => {
  const { close } = mount();
  await openEditor();
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Kategoriyi düzenle' }),
    ).toBeNull(),
  );
  expect(
    screen.getByRole('dialog', { name: 'Kategori yönetimi' }),
  ).toBeTruthy();
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Eğitim kategorisini düzenle' }),
    ),
  );
  expect(close).not.toHaveBeenCalled();
});
it('does not send a no-op edit or retain a cancelled draft on a new opening', async () => {
  mount();
  await openEditor();
  save();
  expect(categoriesAPI.updateCategory).not.toHaveBeenCalled();
  await openEditor();
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: 'Unsaved draft' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  await openEditor();
  expect(
    (screen.getByLabelText('Kategori adı') as HTMLInputElement).value,
  ).toBe('Eğitim');
});
it('requires an explicit migration choice, preserves it on failure, and waits for a successful deletion', async () => {
  vi.mocked(categoriesAPI.deleteCategory)
    .mockRejectedValueOnce(rejection('Önce bir hedef kategori seçin.'))
    .mockRejectedValueOnce(rejection())
    .mockResolvedValueOnce(response());
  const { client } = mount();
  const dialog = await openDelete();
  expect(
    within(dialog).getByText(/bütün kullanıcıların aktif ve pasif dersleri/),
  ).toBeTruthy();
  const target = screen.getByLabelText(
    'Derslerin taşınacağı kategori',
  ) as HTMLSelectElement;
  expect(target.value).toBe('');
  expect(within(target).queryByRole('option', { name: 'Eğitim' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Kategoriyi sil' }));
  await screen.findByText('Önce bir hedef kategori seçin.');
  expect(categoriesAPI.deleteCategory).toHaveBeenCalledWith('1', undefined);
  fireEvent.change(target, { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kategoriyi sil' }));
  await screen.findByText('Hedefte aynı adlı ders var.');
  expect(target.value).toBe('2');
  expect(categoriesAPI.deleteCategory).toHaveBeenCalledTimes(2);
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue(
    response([categories[1]!]),
  );
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Kategoriyi sil' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Kategoriyi sil' })).toBeNull(),
  );
  expect(categoriesAPI.deleteCategory).toHaveBeenLastCalledWith('1', 2);
  expect(
    screen.queryByRole('button', { name: 'Eğitim kategorisini düzenle' }),
  ).toBeNull();
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: accountQueryKeys('1', '').sessions(),
  });
});
it('locks migration selection and duplicate confirmation while deletion is pending', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  vi.mocked(categoriesAPI.deleteCategory).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { close } = mount();
  await openDelete();
  const target = screen.getByLabelText(
    'Derslerin taşınacağı kategori',
  ) as HTMLSelectElement;
  fireEvent.change(target, { target: { value: '2' } });
  const confirm = screen.getByRole('button', { name: 'Kategoriyi sil' });
  act(() => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  expect(categoriesAPI.deleteCategory).toHaveBeenCalledTimes(1);
  expect(target.disabled).toBe(true);
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'İptal' }));
  expect(screen.getByRole('dialog', { name: 'Kategoriyi sil' })).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  await act(async () => finish(response()));
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Kategoriyi sil' })).toBeNull(),
  );
});
it('rejects a migration target removed by a background refetch instead of submitting a stale selection', async () => {
  const { client } = mount();
  await openDelete();
  fireEvent.change(screen.getByLabelText('Derslerin taşınacağı kategori'), {
    target: { value: '2' },
  });
  act(() =>
    client.setQueryData(
      accountQueryKeys('1', '').catalog('categories'),
      response([categories[0]!]),
    ),
  );
  await screen.findByText(
    'Seçilen hedef artık bulunmuyor. Başka bir kategori seçin.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Kategoriyi sil' }));
  expect(categoriesAPI.deleteCategory).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: 'Kategoriyi sil' })).toBeTruthy();
});
it('ignores late mutation acknowledgements after the account boundary changes', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  vi.mocked(categoriesAPI.updateCategory).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { client } = mount();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  await openEditor();
  fireEvent.change(screen.getByLabelText('Kategori adı'), {
    target: { value: 'Updated' },
  });
  save();
  auth.epoch++;
  await act(async () => finish(response()));
  expect(invalidate).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});
it('manages shared categories only, leaving personal ones to their owners', async () => {
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue(
    response([...categories, { ...categories[0]!, id: 9, name: 'Kişisel', userId: 1 }]) as never,
  );
  mount();
  await screen.findByRole('button', { name: 'Eğitim kategorisini düzenle' });
  expect(screen.queryByRole('button', { name: 'Kişisel kategorisini düzenle' })).toBeNull();
});

it('lets an administrator switch to their own personal categories', async () => {
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue(
    response([...categories, { ...categories[0]!, id: 9, name: 'Notlarım', userId: 1 }]) as never,
  );
  mount();
  await screen.findByRole('button', { name: 'Eğitim kategorisini düzenle' });
  fireEvent.click(screen.getByRole('button', { name: 'Kişisel' }));
  expect(screen.getByRole('button', { name: 'Notlarım kategorisini düzenle' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Eğitim kategorisini düzenle' })).toBeNull();
});

it('gives other users their own personal categories and creates new ones as personal', async () => {
  auth.user = { id: '7', role: 'student' };
  vi.mocked(categoriesAPI.getCategories).mockResolvedValue(
    response([
      ...categories,
      { ...categories[0]!, id: 9, name: 'Okuma', userId: 7 },
      { ...categories[0]!, id: 10, name: 'Başkasının', userId: 8 },
    ]) as never,
  );
  vi.mocked(categoriesAPI.createCategory).mockResolvedValue(response() as never);
  mount();
  expect(await screen.findByRole('dialog', { name: 'Kategorilerim' })).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'Kategori türü' })).toBeNull();
  expect(await screen.findByRole('button', { name: 'Okuma kategorisini düzenle' })).toBeTruthy();
  for (const name of ['Eğitim', 'İş', 'Başkasının']) {
    expect(screen.queryByRole('button', { name: `${name} kategorisini düzenle` })).toBeNull();
  }
  // A personal category's records may move to a shared category or another of the user's own.
  fireEvent.click(screen.getByRole('button', { name: 'Okuma kategorisini sil' }));
  const dialog = await screen.findByRole('dialog', { name: 'Kategoriyi sil' });
  const options = within(dialog).getAllByRole('option').map((option) => option.textContent);
  expect(options).toEqual(expect.arrayContaining(['Eğitim', 'İş · Pasif']));
  expect(options.some((option) => option?.startsWith('Başkasının'))).toBe(false);
  fireEvent.click(within(dialog).getByRole('button', { name: 'İptal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Kategori ekle' }));
  const editor = await screen.findByRole('dialog', { name: 'Kategori ekle' });
  fireEvent.change(within(editor).getByLabelText('Kategori adı'), { target: { value: 'Spor' } });
  save();
  await waitFor(() => expect(categoriesAPI.createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: 'Spor', scope: 'personal' })));
});
