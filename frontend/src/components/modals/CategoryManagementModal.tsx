import { useTerms } from '../../hooks/useTerms';
import { Dialog } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCatalogMutation } from '../../hooks/useCatalogMutation';
import { useAuthStore } from '../../store/authStore';
import { categoriesAPI } from '../../services/api';
import { matchesSearch, type CategoryScope } from '@study-tracker/contracts';
import type { CatalogCategoryRecord } from '../../types/catalog';
import { catalogIcon } from '../catalog/catalogIcons';
import ConfirmDialog from '../common/ConfirmDialog';
import CategoryEditorModal from './CategoryEditorModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function CategoryDeleteDialog({
  category,
  categories,
  scope,
  onClose,
}: {
  category: CatalogCategoryRecord;
  /** Categories the records may move to: shared ones, plus the owner's own for a personal category. */
  categories: CatalogCategoryRecord[];
  scope: CategoryScope;
  onClose: () => void;
}) {
  const t = useTerms();
  const [targetId, setTargetId] = useState('');
  const mutation = useCatalogMutation();
  const inputId = useId();
  const targets = categories.filter((item) => item.id !== category.id);
  const validTarget =
    !targetId || targets.some((item) => String(item.id) === targetId);
  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title="Kategoriyi sil"
      confirmText="Kategoriyi sil"
      type="danger"
      message={
        scope === 'shared'
          ? `“${category.name}” kategorisi kalıcı olarak silinecek. Kategori doluysa bütün kullanıcıların aktif ve pasif ${t.course({ case: 'acc', plural: true })} taşıyacağınız hedefi seçin. ${t.course({ plural: true, capitalize: true })}, ${t.topic({ plural: true })}, ${t.session({ plural: true })} ve ilerleme kayıtları korunur.`
          : `“${category.name}” kategorin kalıcı olarak silinecek. Kategori doluysa ${t.course({ case: 'acc', plural: true })} taşıyacağın hedefi seç. ${t.course({ plural: true, capitalize: true })}, ${t.topic({ plural: true })}, ${t.session({ plural: true })} ve ilerleme kayıtları korunur.`
      }
      onConfirm={() =>
        validTarget
          ? mutation.save(
              () =>
                categoriesAPI.deleteCategory(
                  String(category.id),
                  targetId ? Number(targetId) : undefined,
                ),
              `Kategori silindi. ${t.course({ plural: true, capitalize: true })} ve çalışma geçmişi korundu.`,
            )
          : false
      }
    >
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium">
          {t.course({ case: 'gen', plural: true, capitalize: true })} taşınacağı kategori
        </label>
        <select
          id={inputId}
          className="input"
          disabled={mutation.isPending}
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          aria-invalid={!validTarget}
        >
          <option value="">Hedef seçin (kategori boşsa gerekmez)</option>
          {targets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {!item.isActive ? ' · Pasif' : ''}
            </option>
          ))}
        </select>
        {!validTarget && (
          <p role="alert" className="text-sm text-red-600">
            Seçilen hedef artık bulunmuyor. Başka bir kategori seçin.
          </p>
        )}
        {targets.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Dolu bir kategoriyi silmeden önce başka bir kategori ekleyin.
          </p>
        )}
        {mutation.errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {mutation.errorMessage}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

const scopeLabels: Record<CategoryScope, string> = { shared: 'Ortak', personal: 'Kişisel' };

function CategoryManagement({ onClose }: Omit<Props, 'isOpen'>) {
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const user = useAuthStore((state) => state.user);
  const admin = user?.role === 'admin';
  // Admins manage shared categories and may keep personal ones; everyone else only has personal ones.
  const [scope, setScope] = useState<CategoryScope>(admin ? 'shared' : 'personal');
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{
    category: CatalogCategoryRecord | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<CatalogCategoryRecord | null>(null);
  const query = useQuery({
    queryKey: keys.catalog('categories'),
    queryFn: () => categoriesAPI.getCategories(),
  });
  // The list holds shared categories and the user's own personal ones.
  const visible: CatalogCategoryRecord[] = query.data?.data.data?.categories ?? [];
  const categories = visible.filter((category) =>
    scope === 'shared' ? category.userId === null : category.userId === Number(user?.id),
  );
  // Records move only where their owner sees them: shared categories, plus the owner's own for a personal one.
  const moveTargets = visible.filter((category) =>
    category.userId === null || (scope === 'personal' && category.userId === Number(user?.id)),
  );
  const filtered = categories.filter((category) => matchesSearch(category.name, search));
  const close = () => {
    if (!editor && !deleting) onClose();
  };
  return (
    <Dialog open onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="panel w-full max-w-3xl shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
              <div>
                <Dialog.Title className="text-lg font-medium">
                  {admin ? 'Kategori yönetimi' : 'Kategorilerim'}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-[var(--muted)]">
                  {scope === 'shared'
                    ? `Tüm kullanıcıların ${t.course({ case: 'acc', plural: true })} gruplandıran ortak kategorileri yönetin.`
                    : `Yalnız sana görünen kategoriler. Kendi ${t.course({ case: 'acc', plural: true })} bunlarla ya da ortak kategorilerle gruplayabilirsin.`}
                </Dialog.Description>
              </div>
              <button
                className="icon-button"
                onClick={close}
                aria-label="Kategori yönetimini kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {admin && (
                <div role="group" aria-label="Kategori türü" className="segmented-control">
                  {(['shared', 'personal'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={scope === option}
                      onClick={() => { setScope(option); setSearch(''); }}
                      className={`segment ${scope === option ? 'segment-active' : ''}`}
                    >
                      {scopeLabels[option]}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-0 flex-1 basis-48">
                  <label htmlFor={searchId} className="sr-only">
                    Kategori ara
                  </label>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" />
                  <input
                    id={searchId}
                    className="input pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Kategori ara…"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  disabled={!query.isSuccess}
                  onClick={() => setEditor({ category: null })}
                >
                  <Plus className="h-4 w-4" />
                  Kategori ekle
                </button>
              </div>
              {query.isPending ? (
                <p
                  role="status"
                  className="py-8 text-center text-sm text-[var(--muted)]"
                >
                  Kategoriler yükleniyor…
                </p>
              ) : query.isError ? (
                <div role="alert" className="panel p-5 text-sm">
                  Kategoriler yüklenemedi.{' '}
                  <button
                    className="btn btn-secondary ml-2"
                    onClick={() => void query.refetch()}
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[var(--muted)]">
                    {categories.length} kategori · {filtered.length} sonuç
                  </p>
                  <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                    {filtered.map((category) => {
                      const Icon = catalogIcon(category.icon ?? 'Tag');
                      return (
                        <article
                          key={category.id}
                          className="panel flex flex-wrap items-center gap-3 p-4"
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                            style={{ color: category.color }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 basis-32">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-medium">
                                {category.name}
                              </h3>
                              {!category.isActive && (
                                <span className="badge border text-[var(--muted)]">
                                  Pasif
                                </span>
                              )}
                            </div>
                            {category.description && (
                              <p className="mt-1 break-words text-sm text-[var(--muted)]">
                                {category.description}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              Sıra: {category.order}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              className="icon-button"
                              aria-label={`${category.name} kategorisini düzenle`}
                              onClick={() => setEditor({ category })}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`${category.name} kategorisini sil`}
                              onClick={() => setDeleting(category)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div className="py-8 text-center">
                        <Tag className="mx-auto mb-3 h-6 w-6 text-[var(--muted)]" />
                        <p className="text-sm text-[var(--muted)]">
                          {search.trim()
                            ? 'Aramanıza uygun kategori bulunamadı.'
                            : scope === 'shared'
                              ? 'Henüz ortak kategori eklenmedi.'
                              : 'Henüz kişisel kategorin yok.'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </div>
      {editor && (
        <CategoryEditorModal
          key={editor.category?.id ?? 'new'}
          category={editor.category}
          scope={scope}
          nextOrder={
            Math.max(0, ...categories.map((category) => category.order)) + 1
          }
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <CategoryDeleteDialog
          key={deleting.id}
          category={deleting}
          categories={moveTargets}
          scope={scope}
          onClose={() => setDeleting(null)}
        />
      )}
    </Dialog>
  );
}

export default function CategoryManagementModal({ isOpen, onClose }: Props) {
  const { user } = useAuthStore();
  return isOpen && user ? <CategoryManagement onClose={onClose} /> : null;
}
