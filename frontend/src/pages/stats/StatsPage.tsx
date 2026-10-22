import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import DailyStudyChart from '../../components/charts/DailyStudyChart';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useAllCourses } from '../../hooks/useAllCourses';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useTerms } from '../../hooks/useTerms';
import { useWeekStart } from '../../hooks/useWeekStart';
import { studySessionsAPI } from '../../services/api';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { goalPercent } from '../../utils/studyGoals';
import {
  compareWithGoal,
  distribution,
  maxRangeDays,
  presetRange,
  rangeDays,
  rangeError,
  type DateRange,
  type DistributionRow,
  type RangePreset,
} from './statsModel';
import { formatMeasuredSeconds } from '@study-tracker/contracts';
import { useLanguage, useText } from '../../store/languageStore';

const PRESETS: RangePreset[] = ['week', 'month', 'last30', 'last90', 'custom'];

function DistributionList({ title, rows }: { title: string; rows: DistributionRow[] }) {
  const language = useLanguage();
  const text = useText().stats;
  return (
    <section className="panel min-w-0" aria-label={title}>
      <div className="panel-heading">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-(--muted)">{text.noStudy}</p>
      ) : (
        <ul className="divide-y divide-(--line)">
          {rows.map((row) => (
            <li key={row.key} className="space-y-2 px-5 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-(--line)"
                    style={row.color ? { backgroundColor: row.color } : undefined}
                  />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-(--muted)">
                  {formatMeasuredSeconds(row.studySeconds, language)} · %{Math.round(row.share * 100)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-sm bg-(--subtle)" aria-hidden="true">
                <div className="h-full bg-(--solid)" style={{ width: `${row.share * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function StatsPage() {
  const language = useLanguage();
  const text = useText().stats;
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const weekStart = useWeekStart();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const [preset, setPreset] = useState<RangePreset>('week');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('last30', today, weekStart));
  const range = preset === 'custom' ? custom : presetRange(preset, today, weekStart);
  const rangeProblem = rangeError(range);
  const invalid = rangeProblem === 'tooLong' ? text.rangeErrors.tooLong(maxRangeDays) : rangeProblem ? text.rangeErrors[rangeProblem] : null;
  const stats = useQuery({
    queryKey: keys.sessions('statistics', range.startDate, range.endDate),
    queryFn: async () => (await studySessionsAPI.getStats(range)).data.data?.stats,
    enabled: !invalid,
  });
  const courses = useAllCourses();
  const data = stats.data;
  const split = distribution(data?.courses ?? [], courses.data ?? [], text.unassigned);
  const goal = compareWithGoal(data?.days ?? [], preferences);
  const days = rangeDays(range);
  const summary = [
    { label: text.measured, value: formatMeasuredSeconds(data?.studySeconds ?? 0, language), detail: text.measuredDetail },
    { label: text.dailyAverage, value: formatMeasuredSeconds((data?.studySeconds ?? 0) / days, language), detail: text.overDays(days) },
    { label: text.completed(t), value: String(data?.completedSessions ?? 0), detail: text.inRange },
    { label: text.breaks, value: formatMeasuredSeconds(data?.breakSeconds ?? 0, language), detail: text.breaksDetail },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} description={text.description} />

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label={text.range} className="segmented-control flex-wrap">
          {PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              onClick={() => {
                if (id === 'custom' && preset !== 'custom') setCustom(range);
                setPreset(id);
              }}
              className={`segment ${preset === id ? 'segment-active' : ''}`}
            >
              {text.presets[id]}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-(--muted)">
              {text.start}
              <input
                type="date"
                className="input mt-1"
                value={custom.startDate}
                onChange={(event) => setCustom({ ...custom, startDate: event.target.value })}
              />
            </label>
            <label className="text-xs text-(--muted)">
              {text.end}
              <input
                type="date"
                className="input mt-1"
                value={custom.endDate}
                onChange={(event) => setCustom({ ...custom, endDate: event.target.value })}
              />
            </label>
          </div>
        )}
        <p className="text-xs text-(--muted)">
          {range.startDate} – {range.endDate} · {preferences.timezone}
        </p>
      </div>

      {invalid ? (
        <p role="alert" className="text-sm text-red-600">{invalid}</p>
      ) : stats.isPending ? (
        <p role="status" className="text-sm text-(--muted)">{text.loading}</p>
      ) : stats.isError || !data ? (
        <div role="alert" className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
          {text.failed}
          <button type="button" className="btn btn-secondary" onClick={() => void stats.refetch()}>
            {text.retry}
          </button>
        </div>
      ) : (
        <>
          <section aria-label={text.summary} className="panel grid grid-cols-2 divide-x divide-(--line) lg:grid-cols-4">
            {summary.map((item, index) => (
              <div key={item.label} className={`p-5 ${index > 1 ? 'border-t lg:border-t-0' : ''}`}>
                <p className="text-xs text-(--muted)">{item.label}</p>
                <p className="my-3 text-2xl font-medium tabular-nums tracking-tight">{item.value}</p>
                <p className="text-[11px] text-(--muted)">{item.detail}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="goal-comparison-heading" className="panel">
            <div className="panel-heading">
              <h2 id="goal-comparison-heading" className="text-sm font-medium">{text.goalComparison}</h2>
              <Link to="/settings" className="text-xs text-(--muted) hover:text-(--text)">{text.editGoals}</Link>
            </div>
            <div className="space-y-3 p-5 text-sm">
              {goal.targetSeconds === null ? (
                <p className="text-(--muted)">{text.noGoal}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span>
                      {formatMeasuredSeconds(goal.studySeconds, language)} / {formatMeasuredSeconds(goal.targetSeconds, language)}
                    </span>
                    <span className="text-(--muted)">
                      {text.goalDays(goal.metDays, goal.activeDays)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={text.rangeGoal}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={goalPercent(goal.studySeconds, goal.targetSeconds)}
                    className="h-1.5 overflow-hidden rounded-sm bg-(--subtle)"
                  >
                    <div
                      className="h-full bg-(--solid)"
                      style={{ width: `${goalPercent(goal.studySeconds, goal.targetSeconds)}%` }}
                    />
                  </div>
                  <p className="text-xs text-(--muted)">
                    {text.goalHint}
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="panel min-w-0" aria-labelledby="daily-chart-heading">
            <div className="panel-heading">
              <h2 id="daily-chart-heading" className="text-sm font-medium">{text.dailyStudy}</h2>
            </div>
            <div className="h-[300px] px-5 pb-5 pt-7">
              <DailyStudyChart days={data.days} dailyGoal={preferences.dailyStudyGoal} />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <DistributionList title={text.byCategory} rows={split.byCategory} />
            <DistributionList title={text.byRecord(t)} rows={split.byCourse} />
          </div>

          {(data.untrackedSessions > 0 || data.partialSessions > 0) && (
            <p className="text-xs text-(--muted)">
              {text.olderUntracked(data.untrackedSessions + data.partialSessions)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
