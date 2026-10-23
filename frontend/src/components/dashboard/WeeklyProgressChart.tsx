import { lazy, Suspense } from 'react';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useText } from '../../store/languageStore';

// The chart library is the largest dependency; it loads once there is data to draw, after the page's first paint.
const DailyStudyChart = lazy(() => import('../charts/DailyStudyChart'));

const WeeklyProgressChart = () => {
  const { chart: text, dashboard } = useText();
  const { weekDates, query: { data: statsData, isLoading, isError } } = useWeeklyStats();
  const dailyGoal = useUserPreferencesStore((state) => state.preferences.dailyStudyGoal);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (isError) return <p className="p-5 text-sm text-red-600">{text.loadFailed}</p>;

  const days = weekDates.map((date) => ({
    date,
    studySeconds: statsData?.days.find((day) => day.date === date)?.studySeconds ?? 0,
  }));
  return (
    <Suspense fallback={<p role="status" className="text-sm text-(--muted)">{dashboard.chartLoading}</p>}>
      <DailyStudyChart days={days} dailyGoal={dailyGoal} />
    </Suspense>
  );
};

export default WeeklyProgressChart;
