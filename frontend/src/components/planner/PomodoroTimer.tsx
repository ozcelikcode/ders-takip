import { useTerms } from '../../hooks/useTerms';
import { Coffee, Pause, Play, RotateCcw, Square, Target } from 'lucide-react';
import { defaultPomodoroSettings } from '@study-tracker/contracts';
import { usePomodoro } from '../../hooks/usePomodoro';
import type { StudySession } from '../../types/planner';
import { useText } from '../../store/languageStore';

interface PomodoroTimerProps { session: StudySession; onComplete?: (() => void) | undefined }
const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function PomodoroTimer({ session: initialSession, onComplete }: PomodoroTimerProps) {
  const t = useTerms();
  const { pomodoro: text, common } = useText();
  const timer = usePomodoro(initialSession, onComplete);
  const { session } = timer;
  const settings = session.pomodoroSettings ?? defaultPomodoroSettings;
  const terminal = session.status === 'completed' || session.status === 'cancelled';
  return (
    <section className="space-y-7" aria-label={text.timer}>
      <div className="text-center">
        <h2 className="text-lg font-medium">{session.title}</h2>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-(--muted)">
          {timer.phase === 'work' ? <Target className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
          <span role="status">{terminal ? session.status === 'completed' ? text.completed(t) : text.cancelled(t) : text.phases[timer.phase]}</span>
        </div>
        <div className="mt-8 text-[64px] font-medium leading-none tracking-[-0.07em] tabular-nums sm:text-[80px]" role="timer"><span className="sr-only">{text.timeLeft}</span>{formatTime(terminal ? 0 : timer.timeLeft)}</div>
        <p className="mt-4 text-xs text-(--muted)">{text.cycle(timer.cycle, settings.cyclesBeforeLongBreak)}</p>
        <div className="mx-auto mt-6 h-1 max-w-60 overflow-hidden rounded-full bg-(--subtle)" role="progressbar" aria-label={text.progress(t)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timer.progress)}>
          <div className="h-full bg-(--solid)" style={{ width: `${timer.progress}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {!terminal && (timer.isRunning ? (
          <button className="btn btn-primary" aria-label={text.pauseTimer} disabled={timer.isPending} onClick={() => timer.run({ command: 'pause' })}><Pause className="h-4 w-4" />{text.pause}</button>
        ) : (
          <button className="btn btn-primary" aria-label={text.startTimer} disabled={timer.isPending} onClick={() => timer.run({ command: 'resume' })}><Play className="h-4 w-4" />{session.status === 'in_progress' ? text.activate : session.status === 'paused' ? text.resume : text.start}</button>
        ))}
        <button className="btn btn-secondary" aria-label={text.resetTimer} disabled={timer.isPending} onClick={() => timer.run({ command: 'reset' })}><RotateCcw className="h-4 w-4" />{text.reset}</button>
        {!terminal && <button className="btn btn-secondary" aria-label={text.completeSession(t)} disabled={timer.isPending} onClick={() => timer.run({ command: 'complete' })}><Square className="h-4 w-4" />{text.complete}</button>}
      </div>
      {timer.error && <div className="text-center text-sm" role="alert">{text.unverified} <button className="underline" onClick={() => void timer.refresh()}>{text.refresh}</button></div>}
      <div className="space-y-3 border-t border-(--line) pt-5 text-sm">
        <label className="flex items-center justify-center gap-2">
          <input type="checkbox" checked={session.pomodoroClock?.autoStartBreaks ?? false} disabled={terminal || timer.isPending} onChange={event => timer.run({ command: 'configure', autoStartBreaks: event.target.checked })} />
          {text.autoStartBreaks}
        </label>
        <p className="text-center text-xs leading-5 text-(--muted)">{text.serverNote}</p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-center text-xs text-(--muted)">
        <div className="rounded-md bg-(--subtle) p-3"><dt>{text.work}</dt><dd className="mt-1 text-base text-(--text)">{common.minutesShort(settings.workDuration)}</dd></div>
        <div className="rounded-md bg-(--subtle) p-3"><dt>{text.shortBreak}</dt><dd className="mt-1 text-base text-(--text)">{common.minutesShort(settings.shortBreak)}</dd></div>
        <div className="rounded-md bg-(--subtle) p-3"><dt>{text.longBreak}</dt><dd className="mt-1 text-base text-(--text)">{common.minutesShort(settings.longBreak)}</dd></div>
      </dl>
    </section>
  );
}
