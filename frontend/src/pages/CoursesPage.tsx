import { appLocale } from '../lib/locale';
import { useTerms } from '../hooks/useTerms';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { coursesAPI } from '../services/api';
import { useAccountQueryKeys } from '../hooks/useAccountQueryKeys';
import { useAuthStore } from '../store/authStore';
import { canManageCourse } from '../lib/catalogAccess';
import type { CatalogCourse } from '../types/catalog';
import CourseEditorModal from '../components/modals/CourseEditorModal';
import CategoryManagementModal from '../components/modals/CategoryManagementModal';
import CatalogDeleteDialog, {
  type CatalogDeleteTarget,
} from '../components/catalog/CatalogDeleteDialog';
import { catalogIcon } from '../components/catalog/catalogIcons';
import PageHeader from '../components/common/PageHeader';

export default function CoursesPage() {
  const keys = useAccountQueryKeys();
  const t = useTerms();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editor, setEditor] = useState<{ course: CatalogCourse | null } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<CatalogDeleteTarget | null>(null);
  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);
  const query = useQuery({
    queryKey: keys.catalog('courses', { includeTopics: true }),
    queryFn: () => coursesAPI.getCourses({ includeTopics: true }),
  });
  const courses: CatalogCourse[] = query.data?.data.data?.courses ?? [];
  const term = search.trim().toLocaleLowerCase(appLocale);
  const filtered = courses.filter((course) =>
    [
      course.name,
      course.description,
      course.category?.name,
      ...(course.topics ?? []).flatMap((topic) => [
        topic.name,
        topic.description,
      ]),
    ].some((value) => value?.toLocaleLowerCase(appLocale).includes(term)),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title={t.course({ plural: true, capitalize: true })}
        description={`${t.course({ case: 'acc', plural: true, capitalize: true })} ve ${t.topic({ case: 'acc', plural: true })} tek yerde yönetin.`}
        actions={
          <>
            {user?.role === 'admin' && (
              <button
                className="btn btn-secondary"
                onClick={() => setCategoryOpen(true)}
              >
                <Tag className="h-4 w-4" />
                Kategoriler
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setEditor({ course: null })}
            >
              <Plus className="h-4 w-4" />
              {t.course({ capitalize: true })} ekle
            </button>
          </>
        }
      />
      <div className="relative max-w-lg">
        <label htmlFor="course-search" className="sr-only">
          {t.course({ capitalize: true })} ve {t.topic()} ara
        </label>
        <Search
          className="absolute left-3 top-3 h-4 w-4 text-[var(--muted)]"
          aria-hidden="true"
        />
        <input
          id="course-search"
          className="input pl-9 pr-10"
          placeholder={`${t.course({ capitalize: true })}, kategori veya ${t.topic()} ara…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button
            className="absolute right-2 top-2 p-1 text-[var(--muted)]"
            aria-label="Aramayı temizle"
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-[var(--muted)]">
          {t.course({ plural: true, capitalize: true })} yükleniyor…
        </p>
      ) : query.isError ? (
        <div className="panel p-6" role="alert">
          {t.course({ plural: true, capitalize: true })} yüklenemedi.{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void query.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            {filtered.length} {t.course()}{term && ` / ${courses.length} toplam`}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => {
              const Icon = catalogIcon(course.icon);
              return (
                <article
                  key={course.id}
                  className="panel flex flex-col overflow-hidden"
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="flex flex-1 flex-col gap-4 p-5 transition-colors hover:bg-[var(--subtle)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)]"
                        style={{ color: course.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {course.isGlobal && (
                        <span className="badge">Ortak {t.course()}</span>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-[var(--muted)]">
                        {course.category?.name}
                      </p>
                      <h2 className="text-lg font-medium">{course.name}</h2>
                      {course.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-sm text-[var(--muted)]">
                      <span>{course.topics?.length ?? 0} {t.topic()}</span>
                      <span className="flex items-center gap-1">
                        {t.topic({ case: 'acc', plural: true, capitalize: true })} görüntüle
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                  {canManageCourse(course, user) && (
                    <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-4 py-2">
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
                  )}
                </article>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="panel py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
              <h2 className="font-medium">
                {term
                  ? `Aramanıza uygun ${t.course()} bulunamadı`
                  : `Henüz ${t.course()} eklenmedi`}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {term
                  ? `Başka bir ${t.course()} veya ${t.topic()} adı deneyin.`
                  : `Bir ${t.course()} ekleyerek ${t.topic({ case: 'acc', plural: true })} planlamaya başlayın.`}
              </p>
            </div>
          )}
        </>
      )}
      <CourseEditorModal
        isOpen={!!editor}
        course={editor?.course ?? null}
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
