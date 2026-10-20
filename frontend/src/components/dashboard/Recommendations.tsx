import { dateKeyInZone } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarPlus, CheckCircle2, Coffee, Layers, Lightbulb, Target, Timer, TrendingDown, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { canManageCourse, isOwnOrShared } from '../../lib/catalogAccess';
import { coursesAPI, studySessionsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import type { CatalogCourse } from '../../types/catalog';
import { buildRecommendations, type RecommendationKind } from '../../utils/recommendations';
import { isActiveStudyDay, summarizeGoals } from '../../utils/studyGoals';

const icons: Record<RecommendationKind, LucideIcon> = {
  'first-course': BookOpen,
  'add-topics': Layers,
  'plan-today': CalendarPlus,
  'focus-now': Timer,
  'goal-done': CheckCircle2,
  'week-behind': TrendingDown,
  'neglected-course': Target,
  'set-goal': Target,
  'rest-day': Coffee,
  'review-week': Lightbulb,
};
const openStatuses = new Set(['planned', 'in_progress', 'paused']);

/** Next steps built from the user's own records, plans, goals and measured time. */
export default function Recommendations() {
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const user = useAuthStore((state) => state.user);
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const { today, weekDates, query: weekly } = useWeeklyStats();
  // Same keys as the dashboard summary and today's plan list, so the cache is shared.
  const courses = useQuery({
    queryKey: keys.catalog('courses', { includeTopics: true }),
    queryFn: () => coursesAPI.getCourses({ includeTopics: true }),
    select: (response) => (response.data.data?.courses ?? []) as CatalogCourse[],
  });
  const todaySessions = useQuery({
    queryKey: keys.sessions('todays-sessions', today),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({ startDate: today, endDate: today, timezone: preferences.timezone });
      if (!response.data.data?.sessions) throw new Error('Today sessions response is missing');
      return response.data.data.sessions;
    },
  });

  const loading = courses.isPending || weekly.isPending || todaySessions.isPending;
  const failed = courses.isError || weekly.isError || todaySessions.isError;
  const items = loading || failed
    ? []
    : (() => {
        const goals = summarizeGoals(weekly.data?.days ?? [], weekDates, today, preferences);
        const activeWeekDates = weekDates.filter((date) => isActiveStudyDay(date, preferences.activeStudyDays));
        // Days before the account existed, and today itself, are not counted against the user.
        const accountStart = user?.createdAt ? dateKeyInZone(new Date(user.createdAt), preferences.timezone) : today;
        return buildRecommendations({
          terms: t,
          courses: (courses.data ?? []).filter((course) => course.isActive && isOwnOrShared(course, user)).map((course) => ({
            id: course.id,
            name: course.name,
            topicCount: course.topics?.length ?? 0,
            editable: canManageCourse(course, user),
          })),
          weekSecondsByCourse: new Map((weekly.data?.courses ?? []).flatMap((row) => (row.courseId === null ? [] : [[row.courseId, row.studySeconds] as const]))),
          today: { ...goals.today, openSessions: (todaySessions.data ?? []).filter((session) => openStatuses.has(session.status)).length },
          week: { ...goals.week, elapsedActiveDays: activeWeekDates.filter((date) => date < today && date >= accountStart).length, activeDays: activeWeekDates.length },
          dailyGoalSet: preferences.dailyStudyGoal > 0,
          focusMinutes: preferences.defaultPomodoroDuration,
        });
      })();

  return (
    <section aria-labelledby="recommendations-heading" className="panel">
      <div className="panel-heading">
        <div>
          <h2 id="recommendations-heading" className="text-sm font-medium">Öneriler</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Hedeflerine, planına ve bu haftaki çalışmana göre</p>
        </div>
      </div>
      {loading ? (
        <p role="status" className="p-5 text-sm text-[var(--muted)]">Öneriler yükleniyor…</p>
      ) : failed ? (
        <p className="p-5 text-sm text-red-600 dark:text-red-400">Öneriler şu anda hazırlanamadı.</p>
      ) : (
        <ul className="grid divide-y divide-[var(--line)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {items.map((item) => {
            const Icon = icons[item.kind];
            return (
              <li key={item.kind} className="flex flex-col gap-3 p-5">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--subtle)]">
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.detail}</p>
                </div>
                <Link to={item.href} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                  {item.action}
                  <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
