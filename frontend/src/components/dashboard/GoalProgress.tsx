import { Link } from 'react-router-dom';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { formatMeasuredTime } from '../../utils/sessionHelpers';
import { goalPercent, summarizeGoals } from '../../utils/studyGoals';

const hours = (seconds: number) => `${Math.round((seconds / 3600) * 10) / 10} sa`;

function GoalRow({ label, studySeconds, goalSeconds, empty }: { label: string; studySeconds: number; goalSeconds: number | null; empty: string }) {
  const percent = goalPercent(studySeconds, goalSeconds);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-[var(--muted)]">
          {goalSeconds ? `${formatMeasuredTime(studySeconds)} / ${hours(goalSeconds)}` : empty}
        </span>
      </div>
      {goalSeconds !== null && (
        <div
          role="progressbar"
          aria-label={`${label} hedefi`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded bg-[var(--subtle)]"
        >
          <div className="h-full bg-[var(--solid)]" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

/** Measured study time against the daily and weekly goals set in preferences. */
export default function GoalProgress() {
  const { today, weekDates, query } = useWeeklyStats();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const summary = summarizeGoals(query.data?.days ?? [], weekDates, today, preferences);
  return (
    <section aria-labelledby="goal-progress-heading" className="panel">
      <div className="panel-heading">
        <div>
          <h2 id="goal-progress-heading" className="text-sm font-medium">Hedefler</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Ölçülen çalışma; molalar hariç</p>
        </div>
        <Link to="/settings" className="text-xs text-[var(--muted)] hover:text-[var(--text)]">
          Hedefleri düzenle
        </Link>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {query.isPending ? (
          <p role="status" className="text-sm text-[var(--muted)]">Hedefler yükleniyor…</p>
        ) : query.isError ? (
          <p className="text-sm text-red-600">Ölçümler alınamadı.</p>
        ) : (
          <>
            <GoalRow
              label="Bugün"
              studySeconds={summary.today.studySeconds}
              goalSeconds={summary.today.goalSeconds}
              empty={summary.today.activeDay ? 'Günlük hedef yok' : 'Bugün çalışma günün değil'}
            />
            <GoalRow
              label="Bu hafta"
              studySeconds={summary.week.studySeconds}
              goalSeconds={summary.week.goalSeconds}
              empty="Haftalık hedef yok"
            />
          </>
        )}
      </div>
    </section>
  );
}
