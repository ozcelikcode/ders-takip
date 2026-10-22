import { useWeekStart } from '../../hooks/useWeekStart';
import GoalDurationInput, { WeeklyGoalSummary } from '../../components/settings/GoalDurationInput';
import WeekdayPicker from '../../components/settings/WeekdayPicker';
import { goalHoursToMinutes, goalMinutesToHours } from '../../utils/studyGoals';
import { useText } from '../../store/languageStore';
export interface StudyPreferencesDraft {
  defaultPomodoroDuration: number;
  defaultShortBreak: number;
  defaultLongBreak: number;
  pomodorosUntilLongBreak: number;
  /** Hours; the weekly goal is derived from it and the active days. */
  dailyStudyGoal: number;
  activeStudyDays: number[];
}

interface StudyTabProps {
  studyPrefs: StudyPreferencesDraft;
  setStudyPrefs: (draft: StudyPreferencesDraft) => void;
  pending: number;
  onSave: () => void;
  onReset: () => void;
  onRestartOnboarding: () => void;
}

type NumericField = Exclude<keyof StudyPreferencesDraft, 'activeStudyDays' | 'dailyStudyGoal'>;

const FIELDS: { name: NumericField; fallback: number; min: number; max: number }[] = [
  { name: 'defaultPomodoroDuration', fallback: 25, min: 1, max: 120 },
  { name: 'defaultShortBreak', fallback: 5, min: 1, max: 30 },
  { name: 'defaultLongBreak', fallback: 15, min: 1, max: 60 },
  { name: 'pomodorosUntilLongBreak', fallback: 4, min: 1, max: 10 },
];


const StudyTab = ({ studyPrefs, setStudyPrefs, pending, onSave, onReset, onRestartOnboarding }: StudyTabProps) => {
  const text = useText().settings;
  const weekStart = useWeekStart();
  return (
  <section className="space-y-6">
    <h2 className="text-base font-medium">{text.studyTitle}</h2>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {FIELDS.map(({ name, fallback, min, max }) => (
        <div key={name}>
          <label htmlFor={`settings-${name}`} className="mb-2 block text-sm font-medium">
            {text.studyFields[name]}
          </label>
          <input
            id={`settings-${name}`}
            type="number"
            value={studyPrefs[name]}
            onChange={(e) => setStudyPrefs({ ...studyPrefs, [name]: parseInt(e.target.value) || fallback })}
            min={min}
            max={max}
            className="input"
          />
        </div>
      ))}
      <div className="md:col-span-2">
        <p className="text-sm font-medium">{text.activeDaysTitle}</p>
        <p className="mb-2 mt-1 text-xs text-(--muted)">
          {text.activeDaysHint}
        </p>
        <WeekdayPicker
          label={text.activeDays}
          value={studyPrefs.activeStudyDays}
          weekStart={weekStart}
          onChange={(activeStudyDays) => setStudyPrefs({ ...studyPrefs, activeStudyDays })}
        />
      </div>
      <div className="space-y-4 md:col-span-2">
        <GoalDurationInput
          id="settings-daily-goal"
          label={text.dailyGoal}
          minutes={goalHoursToMinutes(studyPrefs.dailyStudyGoal)}
          onChange={(minutes) => setStudyPrefs({ ...studyPrefs, dailyStudyGoal: goalMinutesToHours(minutes) })}
        />
        <WeeklyGoalSummary dailyMinutes={goalHoursToMinutes(studyPrefs.dailyStudyGoal)} activeDays={studyPrefs.activeStudyDays.length} />
      </div>
    </div>

    <div className="flex flex-wrap gap-2 border-t border-(--line) pt-5">
      <button type="button" onClick={onSave} className="btn btn-primary" disabled={pending > 0}>
        {text.save}
      </button>
      <button type="button" onClick={onReset} className="btn btn-secondary text-red-600">
        {text.resetAll}
      </button>
    </div>

    <div className="space-y-2 border-t border-(--line) pt-5">
      <h3 className="text-sm font-medium">{text.setupTitle}</h3>
      <p className="text-sm text-(--muted)">
        {text.setupHint}
      </p>
      <button type="button" onClick={onRestartOnboarding} className="btn btn-secondary" disabled={pending > 0}>
        {text.restartSetup}
      </button>
    </div>
  </section>
  );
};

export default StudyTab;
