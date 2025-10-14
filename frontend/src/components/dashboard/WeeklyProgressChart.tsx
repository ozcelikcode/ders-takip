import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState, useEffect } from 'react';

const WeeklyProgressChart = () => {
  // Detect dark mode reactively
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

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
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDarkMode ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563', fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: isDarkMode ? '#d1d5db' : '#4b5563', fontSize: 12 }}
          label={{
            value: 'Saat',
            angle: -90,
            position: 'insideLeft',
            style: { fill: isDarkMode ? '#d1d5db' : '#4b5563', fontSize: 12 }
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '0.375rem',
            color: isDarkMode ? '#f3f4f6' : '#111827'
          }}
          labelStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
          formatter={(value: number, name: string) => {
            if (name === 'saat') return [`${value} saat`, 'Çalışma Süresi'];
            return value;
          }}
        />
        <Bar
          dataKey="saat"
          fill={isDarkMode ? '#6366f1' : '#3b82f6'}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyProgressChart;
