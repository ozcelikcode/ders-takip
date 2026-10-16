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
  const term = search.trim().toLocaleLowerCase('tr');
  const filtered = courses.filter((course) =>
    [
      course.name,
      course.description,
      course.category?.name,
      ...(course.topics ?? []).flatMap((topic) => [
        topic.name,
        topic.description,
      ]),
    ].some((value) => value?.toLocaleLowerCase('tr').includes(term)),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dersler"
        description="Derslerinizi ve konularınızı tek yerde yönetin."
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
              Ders ekle
            </button>
          </>
        }
      />
      <div className="relative max-w-lg">
        <label htmlFor="course-search" className="sr-only">
          Ders ve konu ara
        </label>
        <Search
          className="absolute left-3 top-3 h-4 w-4 text-[var(--muted)]"
          aria-hidden="true"
        />
        <input
          id="course-search"
          className="input pl-9 pr-10"
          placeholder="Ders, kategori veya konu ara…"
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
          Dersler yükleniyor…
        </p>
      ) : query.isError ? (
        <div className="panel p-6" role="alert">
          Dersler yüklenemedi.{' '}
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
            {filtered.length} ders{term && ` / ${courses.length} toplam`}
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
                        <span className="badge">Ortak ders</span>
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
                      <span>{course.topics?.length ?? 0} konu</span>
                      <span className="flex items-center gap-1">
                        Konuları görüntüle
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                  {canManageCourse(course, user) && (
                    <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-4 py-2">
                      <button
                        className="btn btn-secondary"
                        aria-label={`${course.name} dersini düzenle`}
                        onClick={() => setEditor({ course })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzenle
                      </button>
                      <button
                        className="btn btn-secondary text-red-600"
                        aria-label={`${course.name} dersini sil`}
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
                  ? 'Aramanıza uygun ders bulunamadı'
                  : 'Henüz ders eklenmedi'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {term
                  ? 'Başka bir ders veya konu adı deneyin.'
                  : 'İlk dersinizi ekleyerek konularınızı planlamaya başlayın.'}
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
