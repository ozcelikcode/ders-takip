import { useTerms } from '../../hooks/useTerms';
import type { DragEvent, MouseEvent, PointerEvent, Ref } from 'react';
import { CheckCircle, MoreHorizontal, Pause, Play, Repeat, Timer } from 'lucide-react';
import { formatZonedTime } from '@study-tracker/contracts';
import type { StudySession } from '../../types/planner';
import { canStartSession } from '../../utils/sessionHelpers';
import { canRepositionSession } from './calendarGeometry';
import { useText } from '../../store/languageStore';

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
  /** Starts a resize from the top (`start`) or bottom (`end`) edge. */
  onResize: (event: PointerEvent<HTMLDivElement>, edge: 'start' | 'end') => void;
  /** Whether the top edge starts on this day, so it can be pulled. */
  canResizeStart: boolean;
  /** A touch press on the card, which lifts it for a move after a hold. */
  onTouchPress: (event: PointerEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  actionRef?: Ref<HTMLButtonElement>;
  onActions: (event: MouseEvent<HTMLElement>) => void;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
  onTimer: () => void;
}

export default function CalendarSessionCard(props: Props) {
  const t = useTerms();
  const { session, timezone, top, height, pending } = props;
  const compact = height < 68;
  const canStart = canStartSession(session);
  const { common, planner: text, session: sessionText } = useText();
  const status = sessionText.statuses[session.status];
  return (
    <div
      data-calendar-card
      className={`absolute group rounded-sm border border-(--line) bg-(--surface) text-(--text) ${props.dragging ? 'opacity-30' : ''} ${session.status === 'completed' || session.status === 'cancelled' ? 'opacity-60' : ''}`}
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
      onPointerDown={(event) => {
        if (event.pointerType === 'touch' && !(event.target as Element).closest('[data-resize-handle]')) props.onTouchPress(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        props.onEdit();
      }}
      title={`${session.title} (${formatZonedTime(session.startTime, timezone)} · ${common.minutesShort(session.duration)} · ${status})`}
    >
      <div
        className={`flex h-full overflow-hidden ${compact ? 'items-center gap-1 px-1' : 'flex-col gap-1 p-1.5'}`}
      >
        <div
          className={`flex items-center gap-1 ${compact ? 'min-w-0 flex-1' : 'justify-between'}`}
        >
          {!compact && (
            <span className="flex items-center gap-1 text-[10px] tabular-nums text-(--muted)">
              {formatZonedTime(session.startTime, timezone)}
              {session.seriesId && <Repeat className="h-3 w-3" aria-label={text.routine} role="img" />}
            </span>
          )}
          {compact && (
            <button
              className="min-h-6 min-w-0 flex-1 truncate text-left text-[11px] font-medium"
              aria-description={`${formatZonedTime(session.startTime, timezone)} · ${common.minutesLong(session.duration)} · ${status}`}
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
                    ? text.openTimer
                    : text.start(t)
                }
                onClick={props.onStart}
                className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle) disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            {/* A paused session can always be finished, even after its planned end, when it can no longer resume. */}
            {session.status === 'paused' && (
              <button
                disabled={pending}
                aria-label={text.complete(t)}
                onClick={props.onComplete}
                className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle)"
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </button>
            )}
            {session.status === 'in_progress' && (
              <>
                {session.sessionType === 'pomodoro' && (
                  <button
                    disabled={pending}
                    aria-label={text.openTimer}
                    onClick={props.onTimer}
                    className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle)"
                  >
                    <Timer className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  disabled={pending}
                  aria-label={text.pause(t)}
                  onClick={props.onPause}
                  className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle)"
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={pending}
                  aria-label={text.complete(t)}
                  onClick={props.onComplete}
                  className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle)"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              disabled={pending}
              ref={props.actionRef}
              aria-label={text.actions(session.title)}
              onClick={props.onActions}
              className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm hover:bg-(--subtle)"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {!compact && (
          <button
            className="min-h-6 min-w-0 truncate text-left text-xs font-medium"
            aria-description={`${formatZonedTime(session.startTime, timezone)} · ${common.minutesLong(session.duration)} · ${status}`}
            onClick={(event) => {
              event.stopPropagation();
              props.onEdit();
            }}
          >
            {session.title}
          </button>
        )}
        {height >= 90 && (
          <span className="truncate text-[10px] text-(--muted)">
            {common.minutesShort(session.duration)} · {status}
          </span>
        )}
      </div>
      {/* Edges are thin under a mouse and wider under a finger. */}
      {!pending && props.canResizeStart && canRepositionSession(session) && (
        <div
          data-resize-handle="start"
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize touch-none hover:bg-(--line) pointer-coarse:h-3"
          onPointerDown={(event) => props.onResize(event, 'start')}
          onClick={(event) => event.stopPropagation()}
        />
      )}
      {!pending && props.canResize && canRepositionSession(session) && (
        <div
          data-resize-handle="end"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none hover:bg-(--line) pointer-coarse:h-3"
          onPointerDown={(event) => props.onResize(event, 'end')}
          onClick={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
}
