import { useTerms } from '../../hooks/useTerms';
import { Coffee, Pause, Play, RotateCcw, Square, Target } from 'lucide-react';
import { defaultPomodoroSettings } from '@study-tracker/contracts';
import { usePomodoro } from '../../hooks/usePomodoro';
import type { StudySession } from '../../types/planner';

interface PomodoroTimerProps { session: StudySession; onComplete?: (() => void) | undefined }
const labels = { work: 'Çalışma zamanı', short_break: 'Kısa mola', long_break: 'Uzun mola' };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function PomodoroTimer({ session: initialSession, onComplete }: PomodoroTimerProps) {
  const t = useTerms();
  const timer = usePomodoro(initialSession, onComplete);
  const { session } = timer;
  const settings = session.pomodoroSettings ?? defaultPomodoroSettings;
  const terminal = session.status === 'completed' || session.status === 'cancelled';
  return (
    <section className="space-y-7" aria-label="Pomodoro sayacı">
      <div className="text-center">
        <h2 className="text-lg font-medium">{session.title}</h2>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
          {timer.phase === 'work' ? <Target className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
          <span role="status">{terminal ? session.status === 'completed' ? `${t.session({ capitalize: true })} tamamlandı` : `${t.session({ capitalize: true })} iptal edildi` : labels[timer.phase]}</span>
        </div>
        <div className="mt-8 text-[64px] font-medium leading-none tracking-[-0.07em] tabular-nums sm:text-[80px]" role="timer" aria-label="Kalan süre">{formatTime(terminal ? 0 : timer.timeLeft)}</div>
        <p className="mt-4 text-xs text-[var(--muted)]">{timer.cycle}. döngü / {settings.cyclesBeforeLongBreak}</p>
        <div className="mx-auto mt-6 h-1 max-w-60 overflow-hidden rounded-full bg-[var(--subtle)]" role="progressbar" aria-label={`${t.session({ capitalize: true })} ilerlemesi`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timer.progress)}>
          <div className="h-full bg-[var(--solid)]" style={{ width: `${timer.progress}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {!terminal && (timer.isRunning ? (
          <button className="btn btn-primary" aria-label="Sayacı duraklat" disabled={timer.isPending} onClick={() => timer.run({ command: 'pause' })}><Pause className="h-4 w-4" />Duraklat</button>
        ) : (
          <button className="btn btn-primary" aria-label="Sayacı başlat" disabled={timer.isPending} onClick={() => timer.run({ command: 'resume' })}><Play className="h-4 w-4" />{session.status === 'in_progress' ? 'Sayacı etkinleştir' : session.status === 'paused' ? 'Devam et' : 'Başlat'}</button>
        ))}
        <button className="btn btn-secondary" aria-label="Sayacı sıfırla" disabled={timer.isPending} onClick={() => timer.run({ command: 'reset' })}><RotateCcw className="h-4 w-4" />Sıfırla</button>
        {!terminal && <button className="btn btn-secondary" aria-label={`${t.session({ case: 'acc', capitalize: true })} tamamla`} disabled={timer.isPending} onClick={() => timer.run({ command: 'complete' })}><Square className="h-4 w-4" />Tamamla</button>}
      </div>
      {timer.error && <div className="text-center text-sm" role="alert">Sayaç durumu doğrulanamadı. Sunucudaki kayıt korunuyor. <button className="underline" onClick={() => void timer.refresh()}>Yenile</button></div>}
      <div className="space-y-3 border-t border-[var(--line)] pt-5 text-sm">
        <label className="flex items-center justify-center gap-2">
          <input type="checkbox" checked={session.pomodoroClock?.autoStartBreaks ?? false} disabled={terminal || timer.isPending} onChange={event => timer.run({ command: 'configure', autoStartBreaks: event.target.checked })} />
          Otomatik mola başlat
        </label>
        <p className="text-center text-xs leading-5 text-[var(--muted)]">Sayaç sunucuda sürer. Ekranı kapatmak duraklatmaz. Mola bitince çalışma kendiliğinden başlamaz.</p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-center text-xs text-[var(--muted)]">
        <div className="rounded-md bg-[var(--subtle)] p-3"><dt>Çalışma</dt><dd className="mt-1 text-base text-[var(--text)]">{settings.workDuration} dk</dd></div>
        <div className="rounded-md bg-[var(--subtle)] p-3"><dt>Kısa mola</dt><dd className="mt-1 text-base text-[var(--text)]">{settings.shortBreak} dk</dd></div>
        <div className="rounded-md bg-[var(--subtle)] p-3"><dt>Uzun mola</dt><dd className="mt-1 text-base text-[var(--text)]">{settings.longBreak} dk</dd></div>
      </dl>
    </section>
  );
}
