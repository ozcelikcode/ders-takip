import { useQuery } from '@tanstack/react-query';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCourseGoals } from '../../hooks/useCourseGoals';
import { useTerms } from '../../hooks/useTerms';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { coursesWithTopicsQuery } from '../../lib/accountQueries';
import { useText } from '../../store/languageStore';
import type { CatalogCourse } from '../../types/catalog';
import { GoalRow } from './GoalProgress';

/** This week's measured time for every active record the person set a weekly goal for; nothing while there are none. */
export default function CourseGoalsProgress() {
  const t = useTerms();
  const text = useText().goals;
  const keys = useAccountQueryKeys();
  const goals = useCourseGoals();
  const courses = useQuery({ ...coursesWithTopicsQuery(keys), select: (response) => (response.data.data?.courses ?? []) as CatalogCourse[] });
  const { query: weekly } = useWeeklyStats();
  const rows = (goals.data ?? []).flatMap((goal) => {
    const course = courses.data?.find((item) => item.id === goal.courseId && item.isActive);
    return course ? [{ goal, course }] : [];
  });
  if (!rows.length) return null;
  return (
    <section aria-labelledby="course-goals-heading" className="panel">
      <div className="panel-heading">
        <div>
          <h2 id="course-goals-heading" className="text-sm font-medium">{text.coursesTitle(t)}</h2>
          <p className="mt-1 text-xs text-(--muted)">{text.coursesHint}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {weekly.isError ? (
          <p className="text-sm text-red-600">{text.failed}</p>
        ) : (
          rows.map(({ goal, course }) => (
            <GoalRow
              key={goal.courseId}
              label={course.name}
              studySeconds={weekly.data?.courses.find((row) => row.courseId === goal.courseId)?.studySeconds ?? 0}
              goalSeconds={goal.weeklyMinutes * 60}
              empty=""
            />
          ))
        )}
      </div>
    </section>
  );
}
