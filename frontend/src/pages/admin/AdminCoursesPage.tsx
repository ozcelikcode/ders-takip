import { matchesSearch } from '@study-tracker/contracts';
import { useTerms } from '../../hooks/useTerms';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { coursesAPI } from '../../services/api';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import type { CatalogCourse } from '../../types/catalog';
import CourseEditorModal from '../../components/modals/CourseEditorModal';
import CategoryManagementModal from '../../components/modals/CategoryManagementModal';
import CatalogDeleteDialog, {
  type CatalogDeleteTarget,
} from '../../components/catalog/CatalogDeleteDialog';
import { catalogIcon } from '../../components/catalog/catalogIcons';
import PageHeader from '../../components/common/PageHeader';

export default function AdminCoursesPage() {
  const keys = useAccountQueryKeys();
  const t = useTerms();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ course: CatalogCourse | null } | null>(
    null,
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [deleting, setDeleting] = useState<CatalogDeleteTarget | null>(null);
  const query = useQuery({
    queryKey: keys.catalog('admin-courses'),
    queryFn: async () =>
      (await coursesAPI.getCourses({ isActive: 'all' })).data.data?.courses as
        CatalogCourse[] | undefined,
  });
  const courses = query.data ?? [];
  const term = search.trim();
  const filtered = courses.filter((course) =>
    [course.name, course.category?.name].some((value) => matchesSearch(value, search)),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t.course({ capitalize: true })} yönetimi`}
        description={`${courses.length} ${t.course()} · Ortak ve kişisel ${t.course({ case: 'acc', plural: true })} yönetin.`}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setCategoryOpen(true)}
            >
              <Tag className="h-4 w-4" />
              Kategoriler
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditor({ course: null })}
            >
              <Plus className="h-4 w-4" />
              Ortak {t.course()} ekle
            </button>
          </>
        }
      />
      <div className="relative max-w-lg">
        <label htmlFor="admin-course-search" className="sr-only">
          {t.course({ capitalize: true })} veya kategori ara
        </label>
        <Search className="absolute left-3 top-3 h-4 w-4 text-(--muted)" />
        <input
          id="admin-course-search"
          className="input pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`${t.course({ capitalize: true })} veya kategori ara…`}
        />
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-(--muted)">
          {t.course({ plural: true, capitalize: true })} yükleniyor…
        </p>
      ) : query.isError ? (
        <div role="alert" className="panel p-6">
          {t.course({ plural: true, capitalize: true })} yüklenemedi.{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void query.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const Icon = catalogIcon(course.icon);
            return (
              <article key={course.id} className="panel flex flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5" style={{ color: course.color }} />
                  <div className="flex gap-2">
                    <span className="badge">
                      {course.isGlobal ? `Ortak ${t.course()}` : `Kişisel ${t.course()}`}
                    </span>
                    {!course.isActive && <span className="badge">Pasif</span>}
                  </div>
                </div>
                <p className="mt-4 text-xs text-(--muted)">
                  {course.category?.name}
                </p>
                <h2 className="mt-1 text-lg font-medium">{course.name}</h2>
                {course.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-(--muted)">
                    {course.description}
                  </p>
                )}
                <p className="mb-4 mt-3 text-xs text-(--muted)">
                  Sıra: {course.order}
                </p>
                <div className="mt-auto flex justify-end gap-2 border-t border-(--line) pt-4">
                  <button
                    className="btn btn-secondary"
                    aria-label={`${t.course({ case: 'acc', capitalize: true })} düzenle: ${course.name}`}
                    onClick={() => setEditor({ course })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Düzenle
                  </button>
                  <button
                    className="btn btn-secondary text-red-600"
                    aria-label={`${t.course({ case: 'acc', capitalize: true })} sil: ${course.name}`}
                    onClick={() =>
                      setDeleting({
                        kind: 'course',
                        id: course.id,
                        name: course.name,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </button>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <p className="panel col-span-full p-8 text-center text-sm text-(--muted)">
              {term
                ? `Aramaya uygun ${t.course()} bulunamadı.`
                : `Henüz ${t.course()} eklenmedi.`}
            </p>
          )}
        </div>
      )}
      <CourseEditorModal
        isOpen={!!editor}
        course={editor?.course ?? null}
        defaultGlobal
        onClose={() => setEditor(null)}
      />
      <CategoryManagementModal
        isOpen={categoryOpen}
        onClose={() => setCategoryOpen(false)}
      />
      <CatalogDeleteDialog
        target={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
