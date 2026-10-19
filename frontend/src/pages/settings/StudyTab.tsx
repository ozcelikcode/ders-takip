export interface StudyPreferencesDraft {
  defaultPomodoroDuration: number;
  defaultShortBreak: number;
  defaultLongBreak: number;
  pomodorosUntilLongBreak: number;
  weeklyStudyGoal: number;
  dailyStudyGoal: number;
  activeStudyDays: number[];
}

interface StudyTabProps {
  studyPrefs: StudyPreferencesDraft;
  setStudyPrefs: (draft: StudyPreferencesDraft) => void;
  pending: number;
  onSave: () => void;
  onReset: () => void;
}

type NumericField = Exclude<keyof StudyPreferencesDraft, 'activeStudyDays'>;

const FIELDS: { name: NumericField; label: string; fallback: number; min: number; max: number }[] = [
  { name: 'defaultPomodoroDuration', label: 'Varsayılan Pomodoro Süresi (dk)', fallback: 25, min: 1, max: 120 },
  { name: 'defaultShortBreak', label: 'Kısa Mola Süresi (dk)', fallback: 5, min: 1, max: 30 },
  { name: 'defaultLongBreak', label: 'Uzun Mola Süresi (dk)', fallback: 15, min: 1, max: 60 },
  { name: 'pomodorosUntilLongBreak', label: 'Uzun Molaya Kadar Pomodoro Sayısı', fallback: 4, min: 1, max: 10 },
  { name: 'weeklyStudyGoal', label: 'Haftalık Çalışma Hedefi (saat)', fallback: 20, min: 1, max: 100 },
  { name: 'dailyStudyGoal', label: 'Günlük Çalışma Hedefi (saat)', fallback: 4, min: 1, max: 24 },
];

const DAYS = [
  { id: 1, name: 'Pzt' },
  { id: 2, name: 'Sal' },
  { id: 3, name: 'Çar' },
  { id: 4, name: 'Per' },
  { id: 5, name: 'Cum' },
  { id: 6, name: 'Cmt' },
  { id: 0, name: 'Paz' },
];

const StudyTab = ({ studyPrefs, setStudyPrefs, pending, onSave, onReset }: StudyTabProps) => (
  <section className="space-y-6">
    <h2 className="text-base font-medium">Çalışma tercihleri</h2>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {FIELDS.map(({ name, label, fallback, min, max }) => (
        <div key={name}>
          <label htmlFor={`settings-${name}`} className="mb-2 block text-sm font-medium">
            {label}
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
        <p className="mb-2 text-sm font-medium">Aktif Çalışma Günleri</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const isActive = studyPrefs.activeStudyDays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                aria-pressed={isActive}
                onClick={() =>
                  setStudyPrefs({
                    ...studyPrefs,
                    activeStudyDays: isActive
                      ? studyPrefs.activeStudyDays.filter((id) => id !== day.id)
                      : [...studyPrefs.activeStudyDays, day.id],
                  })
                }
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-[var(--solid)] bg-[var(--solid)] text-[var(--solid-text)]'
                    : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--text)]'
                }`}
              >
                {day.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
      <button type="button" onClick={onSave} className="btn btn-primary" disabled={pending > 0}>
        Kaydet
      </button>
      <button type="button" onClick={onReset} className="btn btn-secondary text-red-600">
        Tüm Tercihleri Sıfırla
      </button>
    </div>
  </section>
);

export default StudyTab;
