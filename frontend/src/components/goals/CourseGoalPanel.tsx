import { maxWeeklyGoalMinutes } from '@study-tracker/contracts';
import { useId, useState } from 'react';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useCourseGoals } from '../../hooks/useCourseGoals';
import { useTerms } from '../../hooks/useTerms';
import { useWeeklyStats } from '../../hooks/useWeeklyStats';
import { courseGoalsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { GoalRow } from '../dashboard/GoalProgress';
import GoalDurationInput from '../settings/GoalDurationInput';

const weeklyPresets = [60, 120, 180, 300, 420, 600];

/** The person's own weekly target for a record and how much of it this week's measured time covers. */
export default function CourseGoalPanel({ courseId }: { courseId: number }) {
  const t = useTerms();
  const { goals: text, common } = useText();
  const id = useId();
  const keys = useAccountQueryKeys();
  const goals = useCourseGoals();
  const { query: weekly } = useWeeklyStats();
  const mutation = useAccountMutation([keys.catalog('course-goals')]);
  const goal = goals.data?.find((item) => item.courseId === courseId) ?? null;
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const studied = weekly.data?.courses.find((row) => row.courseId === courseId)?.studySeconds ?? 0;
  const finish = (saved: boolean) => { if (saved) setEditing(false); };

  return (
    <section aria-labelledby={`${id}-heading`} className="panel">
      <div className="panel-heading">
        <div>
          <h2 id={`${id}-heading`} className="text-sm font-medium">{text.courseTitle}</h2>
          <p className="mt-1 text-xs text-(--muted)">{text.courseHint(t)}</p>
        </div>
        {!editing && goals.isSuccess && (
          <button type="button" className="btn btn-secondary" onClick={() => { setMinutes(goal?.weeklyMinutes ?? 300); setEditing(true); }}>
            {goal ? text.changeCourseGoal : text.setCourseGoal}
          </button>
        )}
      </div>
      <div className="space-y-4 p-5">
        {goals.isPending ? (
          <p role="status" className="text-sm text-(--muted)">{text.loading}</p>
        ) : goals.isError ? (
          <p className="text-sm text-red-600">{text.failed}</p>
        ) : editing ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (minutes > 0) void mutation.save(() => courseGoalsAPI.set(courseId, minutes), text.courseGoalSaved).then(finish);
            }}
          >
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <GoalDurationInput id={`${id}-goal`} label={text.courseGoalLabel} minutes={minutes} onChange={setMinutes} maxMinutes={maxWeeklyGoalMinutes} presets={weeklyPresets} />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={minutes === 0}>{text.saveCourseGoal}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>{common.cancel}</button>
                {goal && (
                  <button type="button" className="btn btn-secondary text-red-600" onClick={() => void mutation.save(() => courseGoalsAPI.clear(courseId), text.courseGoalRemoved).then(finish)}>
                    {text.removeCourseGoal}
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        ) : goal ? (
          weekly.isError ? <p className="text-sm text-red-600">{text.failed}</p>
            : <GoalRow label={text.thisWeek} studySeconds={studied} goalSeconds={goal.weeklyMinutes * 60} empty="" />
        ) : (
          <p className="text-sm text-(--muted)">{text.courseNone}</p>
        )}
        {mutation.errorMessage && <p role="alert" className="text-sm text-red-600">{mutation.errorMessage}</p>}
      </div>
    </section>
  );
}
