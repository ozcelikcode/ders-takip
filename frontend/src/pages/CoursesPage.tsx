import { matchesSearch } from '@study-tracker/contracts';
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
import { coursesWithTopicsQuery } from '../lib/accountQueries';
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
import { useText } from '../store/languageStore';

export default function CoursesPage() {
  const keys = useAccountQueryKeys();
  const t = useTerms();
  const text = useText().records;
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
  const query = useQuery(coursesWithTopicsQuery(keys));
  const courses: CatalogCourse[] = query.data?.data.data?.courses ?? [];
  const term = search.trim();
  const filtered = courses.filter((course) =>
    [
      course.name,
      course.description,
      course.category?.name,
      ...(course.topics ?? []).flatMap((topic) => [
        topic.name,
        topic.description,
      ]),
    ].some((value) => matchesSearch(value, search)),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title={t.course({ plural: true, capitalize: true })}
        description={text.description(t)}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setCategoryOpen(true)}
            >
              <Tag className="h-4 w-4" />
              {user?.role === 'admin' ? text.categories : text.myCategories}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setEditor({ course: null })}
            >
              <Plus className="h-4 w-4" />
              {text.add(t)}
            </button>
          </>
        }
      />
      <div className="relative max-w-lg">
        <label htmlFor="course-search" className="sr-only">
          {text.searchLabel(t)}
        </label>
        <Search
          className="absolute left-3 top-3 h-4 w-4 text-(--muted)"
          aria-hidden="true"
        />
        <input
          id="course-search"
          className="input pl-9 pr-10"
          placeholder={text.searchPlaceholder(t)}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button
            className="absolute right-2 top-2 p-1 text-(--muted)"
            aria-label={text.clearSearch}
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-(--muted)">
          {text.loading(t)}
        </p>
      ) : query.isError ? (
        <div className="panel p-6" role="alert">
          {text.failed(t)}{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void query.refetch()}
          >
            {text.retry}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-(--muted)">
            {text.count(t, filtered.length, term ? courses.length : undefined)}
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
                    className="flex flex-1 flex-col gap-4 p-5 transition-colors hover:bg-(--subtle)"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-(--line)"
                        style={{ color: course.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {course.isGlobal && (
                        <span className="badge">{text.shared(t)}</span>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-(--muted)">
                        {course.category?.name}
                      </p>
                      <h2 className="text-lg font-medium">{course.name}</h2>
                      {course.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-(--muted)">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between text-sm text-(--muted)">
                      <span>{text.topicCount(t, course.topics?.length ?? 0)}</span>
                      <span className="flex items-center gap-1">
                        {text.viewTopics(t)}
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                  {canManageCourse(course, user) && (
                    <div className="flex items-center justify-end gap-2 border-t border-(--line) px-4 py-2">
                      <button
                        className="btn btn-secondary"
                        aria-label={text.editLabel(t, course.name)}
                        onClick={() => setEditor({ course })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {text.edit}
                      </button>
                      <button
                        className="btn btn-secondary text-red-600"
                        aria-label={text.deleteLabel(t, course.name)}
                        onClick={() =>
                          setDeleting({
                            kind: 'course',
                            id: course.id,
                            name: course.name,
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {text.delete}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="panel py-12 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-(--muted)" />
              <h2 className="font-medium">
                {term
                  ? text.noMatch(t)
                  : text.noneYet(t)}
              </h2>
              <p className="mt-2 text-sm text-(--muted)">
                {term
                  ? text.noMatchHint(t)
                  : text.noneYetHint(t)}
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
