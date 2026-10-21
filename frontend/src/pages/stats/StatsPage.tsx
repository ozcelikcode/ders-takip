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
import { formatMeasuredTime } from '../../utils/sessionHelpers';
import { goalPercent } from '../../utils/studyGoals';
import {
  compareWithGoal,
  distribution,
  presetRange,
  rangeDays,
  rangeError,
  type DateRange,
  type DistributionRow,
  type RangePreset,
} from './statsModel';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'week', label: 'Bu hafta' },
  { id: 'month', label: 'Bu ay' },
  { id: 'last30', label: 'Son 30 gün' },
  { id: 'last90', label: 'Son 90 gün' },
  { id: 'custom', label: 'Özel' },
];

function DistributionList({ title, rows }: { title: string; rows: DistributionRow[] }) {
  return (
    <section className="panel min-w-0" aria-label={title}>
      <div className="panel-heading">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-sm text-(--muted)">Bu aralıkta ölçülmüş çalışma yok.</p>
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
                  {formatMeasuredTime(row.studySeconds)} · %{Math.round(row.share * 100)}
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
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const weekStart = useWeekStart();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const [preset, setPreset] = useState<RangePreset>('week');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('last30', today, weekStart));
  const range = preset === 'custom' ? custom : presetRange(preset, today, weekStart);
  const invalid = rangeError(range);
  const stats = useQuery({
    queryKey: keys.sessions('statistics', range.startDate, range.endDate),
    queryFn: async () => (await studySessionsAPI.getStats(range)).data.data?.stats,
    enabled: !invalid,
  });
  const courses = useAllCourses();
  const data = stats.data;
  const split = distribution(data?.courses ?? [], courses.data ?? [], 'Atanmamış');
  const goal = compareWithGoal(data?.days ?? [], preferences);
  const days = rangeDays(range);
  const summary = [
    { label: 'Ölçülen çalışma', value: formatMeasuredTime(data?.studySeconds ?? 0), detail: 'Mola ve duraklama hariç' },
    { label: 'Günlük ortalama', value: formatMeasuredTime((data?.studySeconds ?? 0) / days), detail: `${days} gün üzerinden` },
    { label: `Tamamlanan ${t.session()}`, value: String(data?.completedSessions ?? 0), detail: 'Bu aralıkta' },
    { label: 'Mola', value: formatMeasuredTime(data?.breakSeconds ?? 0), detail: 'Ölçülen mola süresi' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="İstatistikler" description="Ölçülen çalışmanı aralığa, kategoriye ve hedeflerine göre incele." />

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Tarih aralığı" className="segmented-control flex-wrap">
          {PRESETS.map(({ id, label }) => (
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
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-(--muted)">
              Başlangıç
              <input
                type="date"
                className="input mt-1"
                value={custom.startDate}
                onChange={(event) => setCustom({ ...custom, startDate: event.target.value })}
              />
            </label>
            <label className="text-xs text-(--muted)">
              Bitiş
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
        <p role="status" className="text-sm text-(--muted)">İstatistikler yükleniyor…</p>
      ) : stats.isError || !data ? (
        <div role="alert" className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
          İstatistikler alınamadı.
          <button type="button" className="btn btn-secondary" onClick={() => void stats.refetch()}>
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Aralık özeti" className="panel grid grid-cols-2 divide-x divide-(--line) lg:grid-cols-4">
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
              <h2 id="goal-comparison-heading" className="text-sm font-medium">Hedefle karşılaştırma</h2>
              <Link to="/settings" className="text-xs text-(--muted) hover:text-(--text)">Hedefleri düzenle</Link>
            </div>
            <div className="space-y-3 p-5 text-sm">
              {goal.targetSeconds === null ? (
                <p className="text-(--muted)">Günlük hedef belirlenmedi. Hedef, Ayarlar › Çalışma Tercihleri'nden girilir.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span>
                      {formatMeasuredTime(goal.studySeconds)} / {formatMeasuredTime(goal.targetSeconds)}
                    </span>
                    <span className="text-(--muted)">
                      Hedefe ulaşılan gün: {goal.metDays} / {goal.activeDays}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Aralık hedefi"
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
                    Hedef, aralıktaki aktif çalışma günlerinin günlük hedeflerinin toplamıdır.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="panel min-w-0" aria-labelledby="daily-chart-heading">
            <div className="panel-heading">
              <h2 id="daily-chart-heading" className="text-sm font-medium">Günlük çalışma</h2>
            </div>
            <div className="h-[300px] px-5 pb-5 pt-7">
              <DailyStudyChart days={data.days} dailyGoal={preferences.dailyStudyGoal} />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <DistributionList title="Kategoriye göre" rows={split.byCategory} />
            <DistributionList title={`${t.course({ capitalize: true })} bazında`} rows={split.byCourse} />
          </div>

          {(data.untrackedSessions > 0 || data.partialSessions > 0) && (
            <p className="text-xs text-(--muted)">
              Ölçüm öncesi döneme ait {data.untrackedSessions + data.partialSessions} kayıt süreye kısmen veya hiç dahil değildir.
            </p>
          )}
        </>
      )}
    </div>
  );
}
