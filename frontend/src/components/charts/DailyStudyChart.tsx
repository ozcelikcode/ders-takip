import { formatGoalMinutes } from '@study-tracker/contracts';
import { format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '../../lib/locale';
import { useText } from '../../store/languageStore';

interface DailyStudyChartProps {
  days: readonly { date: string; studySeconds: number }[];
  /** Daily goal in hours; 0 hides the goal line. */
  dailyGoal: number;
}

const margin = { top: 25, right: 10, bottom: 24, left: 30 };

/** Rounded only at the top, like a bar standing on the axis. */
const barPath = (x: number, y: number, width: number, height: number) => {
  const r = Math.min(6, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
};

/** Follows the element's size, so the drawing is laid out in real pixels and its text never stretches. */
const useSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
};

/**
 * Measured study per day as bars with the daily goal as a reference line, drawn as plain SVG. The drawing is hidden
 * from assistive technology; a visually hidden table carries the same numbers.
 */
const DailyStudyChart = ({ days, dailyGoal }: DailyStudyChartProps) => {
  const weekdays = useText().calendar.weekdaysShort;
  const text = useText().chart;
  const { language, dateFns } = useLocale();
  const studied = (minutes: number) => (Math.round(minutes) === 0 ? text.noStudyDay : formatGoalMinutes(minutes, language));
  const [ref, { width, height }] = useSize();
  const [hovered, setHovered] = useState<number | null>(null);

  // Short ranges read best with weekday names and value labels; long ranges with dates.
  const compact = days.length <= 14;
  const chartData = useMemo(
    () =>
      days.map(({ date: key, studySeconds }) => {
        const date = new Date(`${key}T12:00:00`);
        const minutes = studySeconds / 60;
        return {
          key,
          name: days.length <= 7 ? weekdays[date.getDay()] : format(date, 'd.MM'),
          fullName: format(date, 'EEEE', { locale: dateFns }),
          date: format(date, 'dd MMM', { locale: dateFns }),
          hours: minutes / 60,
          minutes,
        };
      }),
    [days, dateFns, weekdays],
  );

  // Show measured activity without converting historical plans into actual work.
  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  if (totalMinutes === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-(--muted)">
        <p className="text-sm font-medium mb-2">{text.emptyTitle}</p>
        <p className="text-sm">{text.emptyHint}</p>
      </div>
    );
  }

  const plotWidth = Math.max(0, width - margin.left - margin.right);
  const plotHeight = Math.max(0, height - margin.top - margin.bottom);
  // Whole-hour ticks: four steps up to at least an hour above the highest bar or the goal.
  const highest = Math.max(...chartData.map((day) => day.hours), dailyGoal);
  const step = Math.max(1, Math.ceil((Math.ceil(highest + 1)) / 4));
  const top = Math.max(step * 4, 4);
  const y = (hours: number) => margin.top + plotHeight - (hours / top) * plotHeight;
  const band = chartData.length ? plotWidth / chartData.length : 0;
  const barWidth = compact ? Math.min(32, band * 0.7) : band * 0.7;
  // Long ranges label only every few days, so the dates never overlap.
  const labelEvery = Math.max(1, Math.ceil(chartData.length / Math.max(1, Math.floor(plotWidth / 44))));
  const hoveredDay = hovered === null ? null : chartData[hovered];

  return (
    <figure className="h-full">
      <div ref={ref} className="relative h-full" aria-hidden="true" onMouseLeave={() => setHovered(null)}>
        {width > 0 && height > 0 && (
          <svg width={width} height={height} className="block text-[11px]">
            {Array.from({ length: 5 }, (_, index) => {
              const value = step * index;
              return (
                <g key={value}>
                  <line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className="stroke-(--line)" strokeDasharray="3 3" />
                  <text x={margin.left - 8} y={y(value)} dy="0.32em" textAnchor="end" className="fill-(--muted)">{value}</text>
                </g>
              );
            })}
            {chartData.map((day, index) => {
              const x = margin.left + band * index;
              const barHeight = (day.hours / top) * plotHeight;
              return (
                <g key={day.key} onMouseEnter={() => setHovered(index)}>
                  <rect x={x} y={margin.top} width={band} height={plotHeight} className={hovered === index ? 'fill-(--subtle)' : 'fill-transparent'} />
                  {barHeight > 0 && <path d={barPath(x + (band - barWidth) / 2, y(day.hours), barWidth, barHeight)} className="fill-(--text)" />}
                  {compact && day.minutes >= 0.5 && (
                    <text x={x + band / 2} y={y(day.hours) - 10} textAnchor="middle" className="fill-(--muted) text-[10px] font-semibold">
                      {text.barMinutes(Math.round(day.minutes))}
                    </text>
                  )}
                  {index % labelEvery === 0 && (
                    <text x={x + band / 2} y={height - margin.bottom + 16} textAnchor="middle" className="fill-(--muted)">{day.name}</text>
                  )}
                </g>
              );
            })}
            {dailyGoal > 0 && (
              <g className="pointer-events-none">
                <line x1={margin.left} x2={width - margin.right} y1={y(dailyGoal)} y2={y(dailyGoal)} className="stroke-(--muted)" strokeDasharray="4 4" />
                <text x={width - margin.right - 4} y={y(dailyGoal) - 6} textAnchor="end" className="fill-(--muted)">{text.dailyGoal}</text>
              </g>
            )}
          </svg>
        )}
        {hoveredDay && hovered !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-(--line) bg-(--surface) px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(margin.left + band * hovered + band / 2, Math.max(0, width - 160)), top: 0 }}
          >
            <p className="mb-1 font-semibold">{`${hoveredDay.fullName} (${hoveredDay.date})`}</p>
            <p>{`${text.tooltipStudy}: ${text.tooltipMinutes(Math.round(hoveredDay.minutes * 10) / 10)}`}</p>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>
          {text.caption(dailyGoal > 0 ? formatGoalMinutes(dailyGoal * 60, language) : undefined)}
        </caption>
        <thead>
          <tr>
            <th scope="col">{text.day}</th>
            <th scope="col">{text.measured}</th>
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
