import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, addDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';

// Gün isimleri sabit sıralama
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];

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

  // Bu haftanın başlangıcını al (Pazartesi)
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);

  // Bu haftanın verilerini çek
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['weekly-progress', format(weekStart, 'yyyy-MM-dd')],
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
        saat: Math.round(totalMinutes / 60 * 10) / 10, // Decimal saat
        dakika: totalMinutes,
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
  const totalMinutes = chartData.reduce((sum, day) => sum + day.dakika, 0);
  if (totalMinutes === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">Henüz tamamlanmış çalışma yok</p>
        <p className="text-sm">Bu hafta tamamladığınız çalışmalar burada görünecek</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDarkMode ? '#8b5cf6' : '#6366f1'} />
            <stop offset="100%" stopColor={isDarkMode ? '#6366f1' : '#3b82f6'} />
          </linearGradient>
        </defs>
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
            borderRadius: '0.5rem',
            color: isDarkMode ? '#f3f4f6' : '#111827',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827', fontWeight: 600 }}
          formatter={(value: number, name: string) => {
            if (name === 'saat') return [`${value} saat`, 'Çalışma Süresi'];
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
          dataKey="saat"
          fill="url(#barGradient)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklyProgressChart;
