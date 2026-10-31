import { logStudySchema, wallTimeToInstant } from '@study-tracker/contracts';
import { useId, useState, type FormEvent } from 'react';
import EditorDialog from '../common/EditorDialog';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useAllCourses } from '../../hooks/useAllCourses';
import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useTerms } from '../../hooks/useTerms';
import { studySessionsAPI } from '../../services/api';
import { useText } from '../../store/languageStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';

/** Adds study done without the timer; the server stores it as completed, measured and marked manual. */
export default function LogStudyDialog({ onClose }: { onClose: () => void }) {
  const text = useText().planner;
  const t = useTerms();
  const id = useId();
  const keys = useAccountQueryKeys();
  const timezone = useUserPreferencesStore((state) => state.preferences.timezone);
  const today = useCurrentDateKey();
  const courses = (useAllCourses().data ?? []).filter((course) => course.isActive);
  const mutation = useAccountMutation([keys.sessions()]);
  const [form, setForm] = useState({ courseId: '', title: '', date: today, start: '09:00', minutes: '60', notes: '' });
  const [problem, setProblem] = useState('');
  const set = (patch: Partial<typeof form>) => {
    setProblem('');
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const course = courses.find((item) => String(item.id) === form.courseId);
    const minutes = Number(form.minutes);
    let start: Date;
    try {
      start = wallTimeToInstant(form.date, form.start, timezone);
    } catch {
      setProblem(text.logInvalid);
      return;
    }
    const end = new Date(start.getTime() + minutes * 60_000);
    const parsed = logStudySchema.safeParse({
      title: form.title.trim() || course?.name || '',
      ...(course ? { courseId: course.id } : {}),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
    if (!parsed.success || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
      setProblem(text.logInvalid);
      return;
    }
    if (end.getTime() > Date.now()) {
      setProblem(text.logInFuture);
      return;
    }
    if (await mutation.save(() => studySessionsAPI.logStudy(parsed.data), text.logSaved)) onClose();
  };

  const field = (name: string) => `${id}-${name}`;
  return (
    <EditorDialog
      title={text.logTitle}
      description={text.logDescription(t)}
      pending={mutation.isPending}
      error={problem || mutation.errorMessage}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
    >
      <div>
        <label htmlFor={field('course')} className="mb-1 block text-sm font-medium">{text.logRecord(t)}</label>
        <select id={field('course')} className="input" value={form.courseId} onChange={(event) => set({ courseId: event.target.value })}>
          <option value="">{text.logNoRecord}</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={field('title')} className="mb-1 block text-sm font-medium">{text.logName}</label>
        <input id={field('title')} className="input" maxLength={200} value={form.title} onChange={(event) => set({ title: event.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={field('date')} className="mb-1 block text-sm font-medium">{text.logDate}</label>
          <input id={field('date')} type="date" className="input" max={today} value={form.date} onChange={(event) => set({ date: event.target.value })} />
        </div>
        <div>
          <label htmlFor={field('start')} className="mb-1 block text-sm font-medium">{text.logStart}</label>
          <input id={field('start')} type="time" className="input" value={form.start} onChange={(event) => set({ start: event.target.value })} />
        </div>
        <div>
          <label htmlFor={field('minutes')} className="mb-1 block text-sm font-medium">{text.logMinutes}</label>
          <input id={field('minutes')} type="number" min={1} max={1440} className="input" value={form.minutes} onChange={(event) => set({ minutes: event.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor={field('notes')} className="mb-1 block text-sm font-medium">{text.logNotes}</label>
        <textarea id={field('notes')} className="input" rows={3} maxLength={5000} value={form.notes} onChange={(event) => set({ notes: event.target.value })} />
      </div>
    </EditorDialog>
  );
}
