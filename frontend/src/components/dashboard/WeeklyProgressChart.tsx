import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const WeeklyProgressChart = () => {
  // Son 7 günün verilerini çek
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['weekly-progress'],
    queryFn: async () => {
      const today = new Date();
      const sevenDaysAgo = subDays(today, 6);

      const response = await studySessionsAPI.getSessions({
        startDate: format(sevenDaysAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        status: 'completed',
      });
      return response.data.data?.sessions || [];
    },
  });

  // Günlere göre grupla
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const daySessions = sessionsData?.filter((session: any) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    }) || [];

    const totalMinutes = daySessions.reduce((sum: number, session: any) => sum + session.duration, 0);

    chartData.push({
      name: format(date, 'EEE', { locale: tr }),
      saat: Math.round(totalMinutes / 60 * 10) / 10, // Decimal saat
      dakika: totalMinutes,
    });
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="name"
          className="text-xs fill-gray-600 dark:fill-gray-400"
        />
        <YAxis
          className="text-xs fill-gray-600 dark:fill-gray-400"
          label={{ value: 'Saat', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.375rem',
          }}
          labelStyle={{ color: 'var(--tooltip-text)' }}
          formatter={(value: number, name: string) => {
            if (name === 'saat') return [`${value} saat`, 'Çalışma Süresi'];
            return value;
          }}
        />
        <Bar
          dataKey="saat"
          fill="#3b82f6"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyProgressChart;
