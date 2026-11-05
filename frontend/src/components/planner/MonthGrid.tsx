import { useState, type MouseEvent } from 'react';
import { calendarViewDate, formatZonedTime } from '@study-tracker/contracts';
import { Plus } from 'lucide-react';
import { useTerms } from '../../hooks/useTerms';
import { useText } from '../../store/languageStore';
import type { StudySession } from '../../types/planner';
import { format } from '../../utils/calendarDates';
import { canRepositionSession } from './calendarGeometry';

// Enough to read a busy day at a glance; the rest is one tap away in the daily view.
const visiblePerDay = 3;

interface MonthGridProps {
  /** Six whole weeks, starting on the first day of the week. */
  days: readonly Date[];
  /** Any day of the shown month. */
  month: Date;
  now: Date;
  sessions: readonly StudySession[];
  timezone: string;
  pending: boolean;
  /** Mouse drags move a session to another day at the same time; touch uses the actions menu. */
  canDrag: boolean;
  onOpenDay: (day: Date) => void;
  onCreate?: ((day: Date) => void) | undefined;
  onEdit: (session: StudySession) => void;
  onActions: (event: MouseEvent<HTMLElement>, session: StudySession) => void;
  onMove: (session: StudySession, day: Date) => void;
}

/** A month at a glance: each day lists its sessions by start time; a day opens in the daily view. */
export default function MonthGrid({
  days,
  month,
  now,
  sessions,
  timezone,
  pending,
  canDrag,
  onOpenDay,
  onCreate,
  onEdit,
  onActions,
  onMove,
}: MonthGridProps) {
  const t = useTerms();
  const text = useText().planner;
  const [dragged, setDragged] = useState<StudySession | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const key = (day: Date) => format(day, 'yyyy-MM-dd');
  const today = key(now);
  const shownMonth = format(month, 'yyyy-MM');
  const byDay = new Map<string, StudySession[]>();
  for (const session of [...sessions].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))) {
    const day = key(calendarViewDate(session.startTime, timezone));
    byDay.set(day, [...(byDay.get(day) ?? []), session]);
  }
  const endDrag = () => {
    setDragged(null);
    setTarget(null);
  };
  return (
    // The page section already names the calendar; a second landmark with the same name would be ambiguous.
    <div className="panel overflow-hidden" data-calendar-month>
      <div className="grid grid-cols-7 border-b border-(--line) bg-(--subtle) text-center text-xs text-(--muted)" aria-hidden="true">
        {days.slice(0, 7).map((day) => (
          <div key={key(day)} className="py-2">
            {format(day, 'EEE')}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayKey = key(day);
          const list = byDay.get(dayKey) ?? [];
          const outside = format(day, 'yyyy-MM') !== shownMonth;
          const label = format(day, 'd MMMM yyyy, EEEE');
          return (
            <div
              key={dayKey}
              role="group"
              aria-label={label}
              data-calendar-day={dayKey}
              className={`group/day flex min-h-24 min-w-0 flex-col gap-0.5 border-b border-r border-(--line) p-1 sm:min-h-28 ${outside ? 'bg-(--subtle)/60 text-(--muted)' : ''} ${target === dayKey ? 'outline-2 -outline-offset-2 outline-dashed outline-(--muted)' : ''}`}
              onDragOver={(event) => {
                if (!dragged || pending) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setTarget(dayKey);
              }}
              onDragLeave={() => setTarget((current) => (current === dayKey ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                if (dragged && !pending && key(calendarViewDate(dragged.startTime, timezone)) !== dayKey) onMove(dragged, day);
                endDrag();
              }}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs tabular-nums hover:bg-(--subtle) ${dayKey === today ? 'bg-(--solid) font-medium text-(--solid-text) hover:bg-(--solid)' : ''}`}
                  aria-label={text.openDay(format(day, 'd MMMM'))}
                  aria-current={dayKey === today ? 'date' : undefined}
                  onClick={() => onOpenDay(day)}
                >
                  {format(day, 'd')}
                </button>
                {onCreate && (
                  <button
                    type="button"
                    disabled={pending}
                    // Phones have no room for a second target in a day; there the day opens and takes the new session.
                    className="hidden h-6 w-6 place-items-center rounded-sm text-(--muted) hover:bg-(--subtle) focus-visible:opacity-100 sm:grid sm:opacity-0 sm:group-hover/day:opacity-100"
                    aria-label={text.addOn(t, format(day, 'd MMMM'))}
                    onClick={() => onCreate(day)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {list.slice(0, visiblePerDay).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  draggable={canDrag && !pending && canRepositionSession(session)}
                  onDragStart={(event) => {
                    setDragged(session);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(session.id));
                  }}
                  onDragEnd={endDrag}
                  onClick={() => onEdit(session)}
                  onContextMenu={(event) => onActions(event, session)}
                  title={`${session.title} (${formatZonedTime(session.startTime, timezone)})`}
                  // Finished sessions are muted by color, not opacity, so their text keeps its contrast.
                  className={`flex min-h-6 min-w-0 items-center gap-1 rounded-sm border-l-[3px] bg-(--surface) px-1 text-left text-[11px] leading-tight hover:bg-(--subtle) ${session.status === 'completed' || session.status === 'cancelled' ? 'text-(--muted)' : ''} ${session.status === 'cancelled' ? 'line-through' : ''} ${dragged?.id === session.id ? 'opacity-30' : ''}`}
                  style={{ borderLeftColor: session.color ?? '#737373' }}
                >
                  <span className="hidden shrink-0 tabular-nums text-(--muted) sm:inline">{formatZonedTime(session.startTime, timezone)}</span>
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
              {list.length > visiblePerDay && (
                <button type="button" className="min-h-6 rounded-sm px-1 text-left text-[11px] text-(--muted) hover:bg-(--subtle)" onClick={() => onOpenDay(day)}>
                  {text.moreSessions(list.length - visiblePerDay)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
