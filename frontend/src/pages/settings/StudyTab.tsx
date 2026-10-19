import { useWeekStart } from '../../hooks/useWeekStart';
import WeekdayPicker from '../../components/settings/WeekdayPicker';
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
  onRestartOnboarding: () => void;
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


const StudyTab = ({ studyPrefs, setStudyPrefs, pending, onSave, onReset, onRestartOnboarding }: StudyTabProps) => {
  const weekStart = useWeekStart();
  return (
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
        <p className="text-sm font-medium">Aktif Çalışma Günleri</p>
        <p className="mb-2 mt-1 text-xs text-[var(--muted)]">
          Günlük hedef yalnız bu günlerde uygulanır; panodaki hedef göstergesi ve haftalık grafik bu ayarları kullanır.
        </p>
        <WeekdayPicker
          label="Aktif çalışma günleri"
          value={studyPrefs.activeStudyDays}
          weekStart={weekStart}
          onChange={(activeStudyDays) => setStudyPrefs({ ...studyPrefs, activeStudyDays })}
        />
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

    <div className="space-y-2 border-t border-[var(--line)] pt-5">
      <h3 className="text-sm font-medium">Kurulum sihirbazı</h3>
      <p className="text-sm text-[var(--muted)]">
        Kullanım amacını, hedeflerini ve ilk kayıtlarını baştan seç. Mevcut kayıtların silinmez.
      </p>
      <button type="button" onClick={onRestartOnboarding} className="btn btn-secondary" disabled={pending > 0}>
        Kurulumu yeniden başlat
      </button>
    </div>
  </section>
  );
};

export default StudyTab;
