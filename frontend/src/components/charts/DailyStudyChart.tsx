import { formatGoalMinutes } from '@study-tracker/contracts';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dateFnsLocale, weekdayLabel } from '../../lib/locale';

interface DailyStudyChartProps {
  days: readonly { date: string; studySeconds: number }[];
  /** Daily goal in hours; 0 hides the goal line. */
  dailyGoal: number;
}

const studied = (minutes: number) => (Math.round(minutes) === 0 ? 'Çalışma yok' : formatGoalMinutes(minutes));

/**
 * Measured study per day as bars with the daily goal as a reference line. The drawing is hidden
 * from assistive technology; a visually hidden table carries the same numbers.
 */
const DailyStudyChart = ({ days, dailyGoal }: DailyStudyChartProps) => {
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

  // Short ranges read best with weekday names and value labels; long ranges with dates.
  const compact = days.length <= 14;
  const chartData = useMemo(
    () =>
      days.map(({ date: key, studySeconds }) => {
        const date = new Date(`${key}T12:00:00`);
        const minutes = studySeconds / 60;
        return {
          key,
          name: days.length <= 7 ? weekdayLabel(date.getDay()) : format(date, 'd.MM'),
          fullName: format(date, 'EEEE', { locale: dateFnsLocale }),
          date: format(date, 'dd MMM', { locale: dateFnsLocale }),
          hours: minutes / 60,
          minutes,
        };
      }),
    [days],
  );

  // Show measured activity without converting historical plans into actual work.
  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  if (totalMinutes === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm font-medium mb-2">Henüz ölçülmüş çalışma yok</p>
        <p className="text-sm">Çalışmayı başlattığınızda ölçülen süre burada görünecek</p>
      </div>
    );
  }

  return (
    <figure className="h-full">
      <div className="h-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
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
              domain={[0, (dataMax: number) => Math.max(Math.ceil(Math.max(dataMax, dailyGoal) + 1), 4)]}
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
              formatter={(value, name) =>
                name === 'hours' && typeof value === 'number'
                  ? [`${Math.round(value * 60 * 10) / 10} dakika`, 'Çalışma Süresi']
                  : value
              }
              labelFormatter={(label, payload) => {
                const day: { fullName?: string; date?: string } | undefined = payload?.[0]?.payload;
                return day ? `${day.fullName} (${day.date})` : label;
              }}
            />
            {dailyGoal > 0 && (
              <ReferenceLine
                y={dailyGoal}
                stroke={isDarkMode ? '#a1a1a1' : '#666666'}
                strokeDasharray="4 4"
                label={{ value: 'Günlük hedef', position: 'insideTopRight', fill: isDarkMode ? '#a1a1a1' : '#666666', fontSize: 11 }}
              />
            )}
            <Bar
              dataKey="hours"
              fill={isDarkMode ? '#d4d4d4' : '#262626'}
              radius={[6, 6, 0, 0]}
              {...(compact ? { barSize: 32 } : {})}
            >
              {compact && <LabelList
                dataKey="hours"
                position="top"
                style={{ fill: isDarkMode ? '#d1d5db' : '#4b5563', fontSize: 10, fontWeight: 600 }}
                offset={10}
                formatter={(val) => (typeof val === 'number' && val > 0 ? `${Math.round(val * 60)} dk` : '')}
              />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>
          Günlük ölçülen çalışma{dailyGoal > 0 ? `; günlük hedef ${formatGoalMinutes(dailyGoal * 60)}` : ''}
        </caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            <th scope="col">Ölçülen çalışma</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((day) => (
            <tr key={day.key}>
              <th scope="row">{`${day.fullName}, ${day.date}`}</th>
              <td>{studied(day.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

export default DailyStudyChart;
