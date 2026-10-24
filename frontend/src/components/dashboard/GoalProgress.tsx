import { Link } from 'react-router-dom';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { formatGoalMinutes, goalPercent, summarizeGoals } from '../../utils/studyGoals';
import { formatMeasuredSeconds } from '@study-tracker/contracts';
import { useLanguage, useText } from '../../store/languageStore';

export function GoalRow({ label, studySeconds, goalSeconds, empty }: { label: string; studySeconds: number; goalSeconds: number | null; empty: string }) {
  const language = useLanguage();
  const text = useText().goals;
  const percent = goalPercent(studySeconds, goalSeconds);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-(--muted)">
          {goalSeconds ? `${formatMeasuredSeconds(studySeconds, language)} / ${formatGoalMinutes(goalSeconds / 60, language)}` : empty}
        </span>
      </div>
      {goalSeconds !== null && (
        <div
          role="progressbar"
          aria-label={text.progressLabel(label)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-sm bg-(--subtle)"
        >
          <div className="h-full bg-(--solid)" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

/** Measured study time against the daily and weekly goals set in preferences. */
export default function GoalProgress() {
  const { today, weekDates, query } = useWeeklyStats();
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const text = useText().goals;
  const summary = summarizeGoals(query.data?.days ?? [], weekDates, today, preferences);
  return (
    <section aria-labelledby="goal-progress-heading" className="panel">
      <div className="panel-heading">
        <div>
          <h2 id="goal-progress-heading" className="text-sm font-medium">{text.title}</h2>
          <p className="mt-1 text-xs text-(--muted)">{text.hint}</p>
        </div>
        <Link to="/settings" className="text-xs text-(--muted) hover:text-(--text)">
          {text.edit}
        </Link>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {query.isPending ? (
          <p role="status" className="text-sm text-(--muted)">{text.loading}</p>
        ) : query.isError ? (
          <p className="text-sm text-red-600">{text.failed}</p>
        ) : (
          <>
            <GoalRow
              label={text.today}
              studySeconds={summary.today.studySeconds}
              goalSeconds={summary.today.goalSeconds}
              empty={summary.today.activeDay ? text.noDailyGoal : text.notActiveDay}
            />
            <GoalRow
              label={text.thisWeek}
              studySeconds={summary.week.studySeconds}
              goalSeconds={summary.week.goalSeconds}
              empty={text.noWeeklyGoal}
            />
          </>
        )}
      </div>
    </section>
  );
}
