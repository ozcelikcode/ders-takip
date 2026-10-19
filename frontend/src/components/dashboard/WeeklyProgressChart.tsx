import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import DailyStudyChart from '../charts/DailyStudyChart';

const WeeklyProgressChart = () => {
  const { weekDates, query: { data: statsData, isLoading, isError } } = useWeeklyStats();
  const dailyGoal = useUserPreferencesStore((state) => state.preferences.dailyStudyGoal);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (isError) return <p className="p-5 text-sm text-red-600">Çalışma ölçümleri alınamadı. Lütfen yeniden deneyin.</p>;

  const days = weekDates.map((date) => ({
    date,
    studySeconds: statsData?.days.find((day) => day.date === date)?.studySeconds ?? 0,
  }));
  return <DailyStudyChart days={days} dailyGoal={dailyGoal} />;
};

export default WeeklyProgressChart;
