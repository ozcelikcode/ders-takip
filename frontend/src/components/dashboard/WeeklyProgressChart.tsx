import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, format, startOfDay, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { studySessionsAPI } from '../../services/api';

// Gün isimleri sabit sıralama
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];

const WeeklyProgressChart = () => {
  const accountKeys = useAccountQueryKeys();
  const today = useCurrentDateKey();
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

  // Bu haftanın başlangıcını al (Pazartesi)
  const weekStart = useMemo(() => startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 }), [today]);

  // Bu haftanın verilerini çek
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: accountKeys.sessions('weekly-progress', format(weekStart, 'yyyy-MM-dd')),
    queryFn: async () => {
      const weekEnd = addDays(weekStart, 6);

      const response = await studySessionsAPI.getSessions({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
        status: 'completed',
      });
      return response.data.data?.sessions || [];
    },
    refetchInterval: 30000, // Her 30 saniyede bir yenile
  });

  // Günlere göre grupla - Pazartesi'den Pazar'a
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const daySessions = sessionsData?.filter((session: any) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      }) || [];

      // Duration hesabını doğru yap - null/undefined kontrolü
      const totalMinutes = daySessions.reduce((sum: number, session: any) => {
        const duration = session.duration || 0;
        return sum + duration;
      }, 0);

      data.push({
        name: DAY_NAMES[i],
        fullName: format(date, 'EEEE', { locale: tr }),
        date: format(date, 'dd MMM', { locale: tr }),
        hours: Math.round(totalMinutes / 60 * 10) / 10, // Rounded decimal hours
        minutes: totalMinutes,
      });
    }
    return data;
  }, [sessionsData, weekStart]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Veri yoksa mesaj göster
  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  if (totalMinutes === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm font-medium mb-2">Henüz tamamlanmış çalışma yok</p>
        <p className="text-sm">Bu hafta tamamladığınız çalışmalar burada görünecek</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDarkMode ? '#2a2a2a' : '#e5e5e5'}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax + 1), 4)]}
          tickCount={5}
        />
        <Tooltip
          cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' }}
          contentStyle={{
            backgroundColor: isDarkMode ? '#171717' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#2a2a2a' : '#e5e5e5'}`,
            borderRadius: '0.75rem',
            padding: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          itemStyle={{ padding: 0 }}
          labelStyle={{ color: isDarkMode ? '#f3f4f6' : '#171717', fontWeight: 600, marginBottom: '4px' }}
          formatter={(value: number, name: string) => {
            if (name === 'hours') return [`${value} saat`, 'Çalışma Süresi'];
            return value;
          }}
          labelFormatter={(label: string, payload: any[]) => {
            if (payload && payload[0]) {
              return `${payload[0].payload.fullName} (${payload[0].payload.date})`;
            }
            return label;
          }}
        />
        <Bar
          dataKey="hours"
          fill={isDarkMode ? '#d4d4d4' : '#262626'}
          radius={[6, 6, 0, 0]}
          barSize={32}
        >
          <LabelList
            dataKey="hours"
            position="top"
            style={{ fill: isDarkMode ? '#d1d5db' : '#4b5563', fontSize: 10, fontWeight: 600 }}
            offset={10}
            formatter={(val: number) => val > 0 ? `${val} sa` : ''}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyProgressChart;
