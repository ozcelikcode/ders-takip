import { useQuery } from '@tanstack/react-query';
import TagFilter from '../../components/tags/TagFilter';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import DailyStudyChart from '../../components/charts/DailyStudyChart';
import ConsistencySection from './ConsistencySection';
import { sessionsCsv } from './sessionCsv';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useAllCourses } from '../../hooks/useAllCourses';
import { useTags } from '../../hooks/useTags';
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
  tagDistribution,
  presetRange,
  elapsedDays,
  rangeError,
  type DateRange,
  type DistributionRow,
  type RangePreset,
} from './statsModel';
import { formatGoalMinutes, formatMeasuredSeconds } from '@study-tracker/contracts';
import { useLanguage, useText } from '../../store/languageStore';
import { useLocale } from '../../lib/locale';

const PRESETS: RangePreset[] = ['week', 'month', 'last30', 'last90', 'custom'];

function DistributionList({ title, rows, note }: { title: string; rows: DistributionRow[]; note?: string }) {
  const { language, tag } = useLocale();
  const text = useText().stats;
  const percent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 });
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
                  {formatMeasuredSeconds(row.studySeconds, language)} · {percent.format(row.share)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-sm bg-(--subtle)" aria-hidden="true">
                <div className="h-full bg-(--solid)" style={{ width: `${row.share * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="border-t px-5 py-3 text-xs text-(--muted)">{note}</p>}
    </section>
  );
}

export default function StatsPage() {
  const language = useLanguage();
  const { tag: localeTag } = useLocale();
  const text = useText().stats;
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const weekStart = useWeekStart();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const [preset, setPreset] = useState<RangePreset>('week');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('last30', today, weekStart));
  const range = preset === 'custom' ? custom : presetRange(preset, today, weekStart);
  const [tagId, setTagId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const sessionText = useText().session;
  const rangeProblem = rangeError(range);
  const invalid = rangeProblem === 'tooLong' ? text.rangeErrors.tooLong(maxRangeDays) : rangeProblem ? text.rangeErrors[rangeProblem] : null;
  const stats = useQuery({
    queryKey: keys.sessions('statistics', range.startDate, range.endDate, tagId),
    queryFn: async () => (await studySessionsAPI.getStats({ ...range, ...(tagId ? { tagId } : {}) })).data.data?.stats,
    enabled: !invalid,
  });
  const courses = useAllCourses();
  const data = stats.data;
  const split = distribution(data?.courses ?? [], courses.data ?? [], text.unassigned);
  const tagList = useTags().data?.tags ?? [];
  const byTag = tagDistribution(data?.tags ?? [], tagList, data?.studySeconds ?? 0);
  const goal = compareWithGoal(data?.days ?? [], preferences, today);
  const days = Math.max(1, elapsedDays(range, today));
  const goalShare = goal.targetSeconds === null ? null : goalPercent(goal.studySeconds, goal.targetSeconds);
  const summary = [
    {
      label: text.measured,
      value: formatMeasuredSeconds(data?.studySeconds ?? 0, language),
      detail: text.measuredDetail(formatMeasuredSeconds(data?.breakSeconds ?? 0, language)),
    },
    { label: text.dailyAverage, value: formatMeasuredSeconds((data?.studySeconds ?? 0) / days, language), detail: text.overDays(days) },
    { label: text.completed(t), value: String(data?.completedSessions ?? 0), detail: text.inRange },
  ];
  const day = new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const rangeLabel = `${day.format(new Date(`${range.startDate}T12:00:00Z`))} – ${day.format(new Date(`${range.endDate}T12:00:00Z`))}`;

  // The sessions behind the shown range and tag, as a spreadsheet file.
  const exportCsv = async () => {
    setExporting(true);
    try {
      const sessions = (await studySessionsAPI.getSessions({ ...range, ...(tagId ? { tagId } : {}) })).data.data?.sessions ?? [];
      const csv = sessionsCsv(sessions, preferences.timezone, language === 'tr' ? ';' : ',', {
        headers: text.csvHeaders, statuses: sessionText.statuses, coverage: text.csvCoverage,
      });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = text.csvFile(range.startDate, range.endDate);
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(text.csvFailed);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={text.title}
        description={text.description}
        actions={
          <button type="button" className="btn btn-secondary" disabled={!!invalid || exporting} onClick={() => void exportCsv()}>
            <Download aria-hidden="true" className="h-4 w-4" />
            {exporting ? text.csvExporting : text.csvExport}
          </button>
        }
      />

      {/* What is shown: the range on the left, its dates and an optional tag on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
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
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="stats-start">{text.start}</label>
              <input
                id="stats-start"
                type="date"
                className="input w-auto"
                value={custom.startDate}
                onChange={(event) => setCustom({ ...custom, startDate: event.target.value })}
              />
              <span aria-hidden="true" className="text-(--muted)">–</span>
              <label className="sr-only" htmlFor="stats-end">{text.end}</label>
              <input
                id="stats-end"
                type="date"
                className="input w-auto"
                value={custom.endDate}
                onChange={(event) => setCustom({ ...custom, endDate: event.target.value })}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs tabular-nums text-(--muted)">
            {rangeLabel} · {preferences.timezone}
          </p>
          <TagFilter value={tagId} onChange={setTagId} />
        </div>
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
            {/* The goal for the range: the sum of the daily goals of its active study days. */}
            <div className="border-t p-5 lg:border-t-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs text-(--muted)">{text.goal}</p>
                <Link to="/settings?tab=study" className="text-[11px] text-(--muted) underline-offset-4 hover:text-(--text) hover:underline">
                  {text.editGoals}
                </Link>
              </div>
              <p className="my-3 text-2xl font-medium tabular-nums tracking-tight">
                {goalShare === null ? '—' : new Intl.NumberFormat(localeTag, { style: 'percent', maximumFractionDigits: 0 }).format(goalShare / 100)}
              </p>
              {goal.targetSeconds === null ? (
                <p className="text-[11px] text-(--muted)">{text.noGoal}</p>
              ) : (
                <>
                  <div
                    role="progressbar"
                    aria-label={text.rangeGoal}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={goalShare ?? 0}
                    className="mb-2 h-1 overflow-hidden rounded-sm bg-(--subtle)"
                  >
                    <div className="h-full bg-(--solid)" style={{ width: `${goalShare ?? 0}%` }} />
                  </div>
                  <p className="text-[11px] text-(--muted)">
                    {text.goalDetail(
                      formatMeasuredSeconds(goal.studySeconds, language),
                      formatGoalMinutes(goal.targetSeconds / 60, language),
                      goal.metDays,
                      goal.activeDays,
                    )}
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

          {/* Each list keeps its own height, so a short one never leaves an empty block beside a long one. */}
          <section aria-labelledby="breakdown-heading" className="space-y-3">
            <h2 id="breakdown-heading" className="text-sm font-medium">{text.breakdown}</h2>
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <DistributionList title={text.byRecord(t)} rows={split.byCourse} />
              <div className="grid gap-5">
                <DistributionList title={text.byCategory} rows={split.byCategory} />
                {tagList.length > 0 && <DistributionList title={text.byTag} rows={byTag} note={text.byTagHint} />}
              </div>
            </div>
          </section>

          {(data.untrackedSessions > 0 || data.partialSessions > 0) && (
            <p className="text-xs text-(--muted)">
              {text.olderUntracked(data.untrackedSessions + data.partialSessions)}
            </p>
          )}
        </>
      )}
      {/* Independent of the chosen range and tag: always the last year of all measured study. */}
      <ConsistencySection today={today} />
    </div>
  );
}
