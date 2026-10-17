import type { DragEvent, MouseEvent, PointerEvent, Ref } from 'react';
import { CheckCircle, MoreHorizontal, Pause, Play, Timer } from 'lucide-react';
import { formatZonedTime } from '@study-tracker/contracts';
import type { StudySession } from '../../types/planner';
import { canStartSession } from '../../utils/sessionHelpers';
import { canRepositionSession } from './calendarGeometry';

interface Props {
  session: StudySession;
  timezone: string;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
  pending: boolean;
  dragging: boolean;
  resizing: boolean;
  canDrag: boolean;
  canResize: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onResize: (event: PointerEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  actionRef?: Ref<HTMLButtonElement>;
  onActions: (event: MouseEvent<HTMLElement>) => void;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onTimer: () => void;
}

export default function CalendarSessionCard(props: Props) {
  const { session, timezone, top, height, pending } = props;
  const compact = height < 68;
  const canStart = canStartSession(session);
  const status = {
    planned: 'Planlandı',
    in_progress: 'Devam ediyor',
    paused: 'Duraklatıldı',
    completed: 'Tamamlandı',
    cancelled: 'İptal edildi',
  }[session.status];
  return (
    <div
      className={`absolute group rounded border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] ${props.dragging ? 'opacity-30' : ''} ${session.status === 'completed' || session.status === 'cancelled' ? 'opacity-60' : ''}`}
      style={{
        top,
        height,
        left: `calc(${(props.lane / props.laneCount) * 100}% + 4px)`,
        width: `calc(${100 / props.laneCount}% - 8px)`,
        zIndex: props.dragging || props.resizing ? 30 : 10,
        borderLeft: `3px solid ${session.color ?? '#737373'}`,
      }}
      draggable={!pending && props.canDrag && canRepositionSession(session)}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onContextMenu={props.onActions}
      onClick={(event) => {
        event.stopPropagation();
        props.onEdit();
      }}
      title={`${session.title} (${formatZonedTime(session.startTime, timezone)} · ${session.duration} dk · ${status})`}
    >
      <div
        className={`flex h-full overflow-hidden ${compact ? 'items-center gap-1 px-1' : 'flex-col gap-1 p-1.5'}`}
      >
        <div
          className={`flex items-center gap-1 ${compact ? 'min-w-0 flex-1' : 'justify-between'}`}
        >
          {!compact && (
            <span className="text-[10px] tabular-nums text-[var(--muted)]">
              {formatZonedTime(session.startTime, timezone)}
            </span>
          )}
          {compact && (
            <button
              className="min-h-6 min-w-0 flex-1 truncate text-left text-[11px] font-medium"
              aria-description={`${formatZonedTime(session.startTime, timezone)} · ${session.duration} dakika · ${status}`}
              onClick={(event) => {
                event.stopPropagation();
                props.onEdit();
              }}
            >
              {session.title}
            </button>
          )}
          <div
            className="flex shrink-0 items-center"
            onClick={(event) => event.stopPropagation()}
          >
            {((session.status === 'planned' && canStart) ||
              session.status === 'paused') && (
              <button
                disabled={pending || !canStart}
                aria-label={
                  session.sessionType === 'pomodoro'
                    ? 'Pomodoro sayacını aç'
                    : 'Seansı başlat'
                }
                onClick={props.onStart}
                className="inline-flex min-h-6 min-w-6 items-center justify-center rounded hover:bg-[var(--subtle)] disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            {session.status === 'in_progress' && (
              <>
                {session.sessionType === 'pomodoro' && (
                  <button
                    disabled={pending}
                    aria-label="Pomodoro sayacını aç"
                    onClick={props.onTimer}
                    className="inline-flex min-h-6 min-w-6 items-center justify-center rounded hover:bg-[var(--subtle)]"
                  >
                    <Timer className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  disabled={pending}
                  aria-label="Seansı duraklat"
                  onClick={props.onPause}
                  className="inline-flex min-h-6 min-w-6 items-center justify-center rounded hover:bg-[var(--subtle)]"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={pending}
                  aria-label="Seansı tamamla"
                  onClick={props.onComplete}
                  className="inline-flex min-h-6 min-w-6 items-center justify-center rounded hover:bg-[var(--subtle)]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              disabled={pending}
              ref={props.actionRef}
              aria-label={`${session.title}: işlemler`}
              onClick={props.onActions}
              className="inline-flex min-h-6 min-w-6 items-center justify-center rounded hover:bg-[var(--subtle)]"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {!compact && (
          <button
            className="min-h-6 min-w-0 truncate text-left text-xs font-medium"
            aria-description={`${formatZonedTime(session.startTime, timezone)} · ${session.duration} dakika · ${status}`}
            onClick={(event) => {
              event.stopPropagation();
              props.onEdit();
            }}
          >
            {session.title}
          </button>
        )}
        {height >= 90 && (
          <span className="truncate text-[10px] text-[var(--muted)]">
            {session.duration} dk · {status}
          </span>
        )}
      </div>
      {!pending && props.canResize && canRepositionSession(session) && (
        <div
          data-resize-handle
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none hover:bg-[var(--line)]"
          onPointerDown={props.onResize}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}
