import { useTerms } from '../../hooks/useTerms';
import { Pencil, Trash2 } from 'lucide-react';
import { catalogIcon } from '../../components/catalog/catalogIcons';
import type { CatalogCourse } from '../../types/catalog';
import type { topicStats } from './courseTopics';

interface CourseHeaderProps {
  course: CatalogCourse;
  stats: ReturnType<typeof topicStats>;
  progressPercentage: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const CourseHeader = ({
  course,
  stats,
  progressPercentage,
  canEdit,
  onEdit,
  onDelete,
}: CourseHeaderProps) => {
  const t = useTerms();
  const Icon = catalogIcon(course.icon);
  return (
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
              style={{ color: course.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-(--muted)">
                {course.category?.name}
                {course.isGlobal ? ` · Ortak ${t.course()}` : ''}
              </p>
              <h1 className="mt-1 wrap-break-word text-2xl font-medium tracking-tight">
                {course.name}
              </h1>
              {course.description && (
                <p className="mt-2 text-sm text-(--muted)">
                  {course.description}
                </p>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
                {t.course({ case: 'acc', capitalize: true })} düzenle
              </button>
              <button
                className="btn btn-secondary text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                {t.course({ case: 'acc', capitalize: true })} sil
              </button>
            </div>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          {[
            [stats.total, `Toplam ${t.topic({ capitalize: true })}`],
            [stats.completed, 'Tamamlandı'],
            [stats.inProgress, 'Devam Ediyor'],
            [stats.notStarted, 'Başlanmadı'],
          ].map(([count, label]) => (
            <div key={label}>
              <div className="text-2xl font-medium tabular-nums">{count}</div>
              <div className="mt-1 text-xs text-(--muted)">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs text-(--muted)">
            <span>Aktif {t.topic({ case: 'loc', plural: true })} ilerleme</span>
            <span>{progressPercentage}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${t.topic({ capitalize: true })} ilerlemesi`}
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-sm bg-(--subtle)"
          >
            <div
              className="h-full bg-(--solid)"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </section>
  );
};

export default CourseHeader;
