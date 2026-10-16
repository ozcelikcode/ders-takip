import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Dialog } from '@headlessui/react';
import { CalendarDate, calendarViewDate } from '@study-tracker/contracts';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  MoveRight,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { addDays, format } from '../../utils/calendarDates';
import type { StudySession } from '../../types/planner';
import { initializeCalendarViewport } from './calendarViewport';
import {
  calendarHours,
  calendarSegment,
  canRepositionSession,
  resizedDuration,
  sessionMinutes,
  snappedDropMinute,
  type CalendarMode,
} from './calendarGeometry';
import { usePlannerCalendar } from './usePlannerCalendar';
import CalendarSessionCard from './CalendarSessionCard';
import CreateSessionModal from './CreateSessionModal';
import MoveSessionModal from './MoveSessionModal';
import PomodoroModal from './PomodoroModal';
import ConfirmDialog from '../common/ConfirmDialog';

export interface PlannerCalendarProps {
  onCreateSession?: ((date: Date, hour: number) => void) | undefined;
}
interface Props extends PlannerCalendarProps {
  mode: CalendarMode;
}
type Drag = { session: StudySession; offset: number };
type Drop = { day: number; hour: number; minute: number };
type Resize = {
  session: StudySession;
  y: number;
  minutes: number;
  preview: number;
};

export default function PlannerCalendar({ mode, onCreateSession }: Props) {
  const planner = usePlannerCalendar(mode);
  const { days, timezone, query, pending } = planner;
  const weekly = mode === 'weekly';
  const hourHeight = weekly ? 48 : 64;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [resize, setResize] = useState<Resize | null>(null);
  const [actions, setActions] = useState<{
    session: StudySession;
    x: number;
    y: number;
  } | null>(null);
  const [hoverDirection, setHoverDirection] = useState<number | null>(null);
  const suppressClickUntil = useRef(0);
  const dateKey = format(days[0]!, 'yyyy-MM-dd');
  const sessions = query.data ?? [];
  const daySegments = days.map((day) =>
    sessions
      .map((session) => {
        const preview =
          resize?.session.id === session.id
            ? {
                ...session,
                endTime: new Date(
                  Date.parse(session.startTime) + resize.preview * 60000,
                ).toISOString(),
                duration: resize.preview,
              }
            : session;
        return {
          session,
          preview,
          segment: calendarSegment(preview, day, timezone, hourHeight),
        };
      })
      .filter(({ segment }) => segment.minutes > 0),
  );
  const clearDrag = () => {
    setDrag(null);
    setDrop(null);
    setHoverDirection(null);
    suppressClickUntil.current = Date.now() + 150;
  };
  useEffect(() => {
    setDrag(null);
    setDrop(null);
    setResize(null);
    setActions(null);
  }, [timezone]);
  useEffect(() => {
    setResize(null);
  }, [dateKey]);
  useEffect(() => {
    if (!drag) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearDrag();
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [drag]);
  useEffect(() => {
    if (hoverDirection === null || !drag) return;
    const timer = window.setTimeout(() => {
      planner.navigate(hoverDirection);
      setDrop(null);
      setHoverDirection(null);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [hoverDirection, drag, dateKey]);
  useEffect(() => {
    if (!resize) return;
    const initial = resize;
    const move = (event: globalThis.PointerEvent) =>
      setResize((previous) =>
        previous
          ? {
              ...previous,
              preview: resizedDuration(
                initial.minutes,
                event.clientY - initial.y,
                hourHeight,
              ),
            }
          : null,
      );
    const up = (event: globalThis.PointerEvent) => {
      setResize(null);
      suppressClickUntil.current = Date.now() + 150;
      void planner.resize(
        initial.session,
        resizedDuration(initial.minutes, event.clientY - initial.y, hourHeight),
      );
    };
    const cancel = () => setResize(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
    };
  }, [resize?.session.id, hourHeight, timezone, dateKey]);

  const beginDrag = (
    event: DragEvent<HTMLDivElement>,
    session: StudySession,
  ) => {
    if (pending || !canRepositionSession(session)) {
      event.preventDefault();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientY - rect.top >= rect.height - 6) {
      event.preventDefault();
      return;
    }
    setDrag({ session, offset: event.clientY - rect.top });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(session.id));
  };
  const dragOver = (
    event: DragEvent<HTMLDivElement>,
    day: number,
    hour: number,
  ) => {
    if (!drag || pending) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const minute = snappedDropMinute(
      hour,
      event.clientY -
        event.currentTarget.getBoundingClientRect().top -
        drag.offset,
      hourHeight,
    );
    setDrop({ day, hour, minute });
  };
  const dropSession = (
    event: DragEvent<HTMLDivElement>,
    day: number,
    hour: number,
  ) => {
    event.preventDefault();
    if (!drag || pending) return;
    const minute = snappedDropMinute(
      hour,
      event.clientY -
        event.currentTarget.getBoundingClientRect().top -
        drag.offset,
      hourHeight,
    );
    void planner.move(drag.session, days[day]!, minute);
    clearDrag();
  };
  const beginResize = (
    event: PointerEvent<HTMLDivElement>,
    session: StudySession,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending || !canRepositionSession(session)) return;
    const minutes = sessionMinutes(session);
    setResize({ session, y: event.clientY, minutes, preview: minutes });
  };
  const openActions = (
    event: MouseEvent<HTMLElement>,
    session: StudySession,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setActions({
      session,
      x: Math.max(
        8,
        Math.min(event.clientX || rect.left, window.innerWidth - 232),
      ),
      y: Math.max(
        8,
        Math.min(event.clientY || rect.bottom, window.innerHeight - 260),
      ),
    });
  };
  const create = (day: number, hour: number) => {
    if (pending || resize || drag || Date.now() < suppressClickUntil.current)
      return;
    const date = new CalendarDate(days[day]!);
    date.setHours(hour, 0, 0, 0);
    onCreateSession?.(date, hour);
  };
  const shiftDragged = (direction: number) => {
    if (!drag) return;
    void planner.move(
      drag.session,
      addDays(
        calendarViewDate(drag.session.startTime, timezone),
        direction * days.length,
      ),
    );
    clearDrag();
  };

  return (
    <div className="space-y-4" aria-busy={pending}>
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-title">
          <h2 className="text-sm font-medium">
            {weekly ? 'Haftalık Planlayıcı' : 'Günlük Planlayıcı'}
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {weekly
              ? `${format(days[0]!, 'd MMMM')} – ${format(days[6]!, 'd MMMM yyyy')}`
              : format(days[0]!, 'd MMMM yyyy, EEEE')}
          </p>
        </div>
        <div className="date-navigation">
          {[-1, 0, 1].map((direction) => (
            <button
              key={direction}
              disabled={pending}
              className="btn btn-secondary"
              aria-label={
                direction
                  ? `${direction < 0 ? 'Önceki' : 'Sonraki'} ${weekly ? 'hafta' : 'gün'}`
                  : 'Bugün'
              }
              onClick={() =>
                direction
                  ? planner.navigate(direction)
                  : planner.setDate(planner.today())
              }
              onDragOver={(event) => {
                if (drag && direction) {
                  event.preventDefault();
                  setHoverDirection(direction);
                }
              }}
              onDragLeave={() => setHoverDirection(null)}
              onDrop={(event) => {
                event.preventDefault();
                if (direction) planner.navigate(direction);
                clearDrag();
              }}
            >
              {direction === -1 ? (
                <ChevronLeft className="h-4 w-4" />
              ) : direction === 1 ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                'Bugün'
              )}
            </button>
          ))}
        </div>
      </div>
      {query.isError ? (
        <div role="alert" className="panel p-6 text-center">
          <p>Planlayıcı verileri alınamadı.</p>
          <button
            className="btn btn-secondary mt-3"
            onClick={() => void query.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      ) : query.isPending ? (
        <p role="status" className="panel p-6">
          Takvim yükleniyor…
        </p>
      ) : (
        <div className="panel overflow-hidden">
          <div
            className="relative max-h-[640px] overflow-auto"
            tabIndex={0}
            aria-label={`${weekly ? 'Haftalık' : 'Günlük'} takvim, saatleri görmek için kaydırın`}
            ref={initializeCalendarViewport}
          >
            <div style={{ minWidth: weekly ? 800 : 0 }}>
              <div
                data-calendar-header
                className="sticky top-0 z-40 grid border-b border-[var(--line)] bg-[var(--surface)]"
                style={{
                  gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="flex items-center justify-center border-r border-[var(--line)]">
                  <Clock className="h-4 w-4 text-[var(--muted)]" />
                </div>
                {days.map((day) => (
                  <div
                    key={day.getTime()}
                    className={`p-3 text-center text-xs ${format(day, 'yyyy-MM-dd') === format(planner.now, 'yyyy-MM-dd') ? 'bg-[var(--subtle)]' : ''}`}
                  >
                    <p className="font-medium">{format(day, 'EEEE')}</p>
                    <p className="mt-1 text-[var(--muted)]">
                      {format(day, 'd MMM')}
                    </p>
                  </div>
                ))}
              </div>
              {calendarHours.map((hour) => (
                <div
                  key={hour}
                  data-calendar-hour={hour}
                  className="grid border-b border-[var(--line)]"
                  style={{
                    gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
                    height: hourHeight,
                  }}
                >
                  <div className="flex items-start justify-center border-r border-[var(--line)] bg-[var(--subtle)] pt-2 text-[11px] tabular-nums text-[var(--muted)]">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {days.map((day, index) => {
                    const segments = daySegments[index]!.filter(
                      ({ segment }) => segment.hour === hour,
                    );
                    const current =
                      format(day, 'yyyy-MM-dd') ===
                        format(planner.now, 'yyyy-MM-dd') &&
                      planner.now.getHours() === hour;
                    const occupied = daySegments[index]!.some(
                      ({ session, segment }) =>
                        session.status !== 'cancelled' &&
                        segment.hour * 60 + (segment.top / hourHeight) * 60 <
                          (hour + 1) * 60 &&
                        segment.hour * 60 +
                          (segment.top / hourHeight) * 60 +
                          segment.minutes >
                          hour * 60,
                    );
                    return (
                      <div
                        key={day.getTime()}
                        data-calendar-slot={`${format(day, 'yyyy-MM-dd')}T${String(hour).padStart(2, '0')}:00`}
                        className="relative border-r border-[var(--line)] hover:bg-[var(--subtle)]"
                        onDragOver={(event) => dragOver(event, index, hour)}
                        onDragLeave={() => setDrop(null)}
                        onDrop={(event) => dropSession(event, index, hour)}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--line)] opacity-50" />
                        {!occupied && onCreateSession && (
                          <button
                            disabled={pending}
                            aria-label={`${format(day, 'd MMMM')} ${String(hour).padStart(2, '0')}:00 seans ekle`}
                            className="absolute inset-0 flex items-center justify-center text-[var(--muted)] opacity-0 hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => create(index, hour)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                        {current && (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 z-30 border-t border-red-500"
                            style={{
                              top: (planner.now.getMinutes() / 60) * hourHeight,
                            }}
                          />
                        )}
                        {drag && drop?.day === index && drop.hour === hour && (
                          <div
                            className="pointer-events-none absolute inset-x-1 z-20 rounded border border-dashed border-[var(--muted)] bg-[var(--subtle)] opacity-70"
                            style={{
                              top:
                                ((drop.minute - hour * 60) / 60) * hourHeight,
                              height: Math.max(
                                20,
                                (sessionMinutes(drag.session) / 60) *
                                  hourHeight,
                              ),
                            }}
                          >
                            <span className="p-1 text-[10px] tabular-nums">
                              {String(Math.floor(drop.minute / 60)).padStart(
                                2,
                                '0',
                              )}
                              :{String(drop.minute % 60).padStart(2, '0')}
                            </span>
                          </div>
                        )}
                        {segments.map(({ session, preview, segment }) => (
                          <CalendarSessionCard
                            key={session.id}
                            session={preview}
                            timezone={timezone}
                            top={segment.top}
                            height={segment.height}
                            pending={pending}
                            dragging={drag?.session.id === session.id}
                            resizing={resize?.session.id === session.id}
                            canDrag={segment.startsHere}
                            canResize={segment.endsHere}
                            onDragStart={(event) => beginDrag(event, session)}
                            onDragEnd={clearDrag}
                            onResize={(event) => beginResize(event, session)}
                            onEdit={() => {
                              if (
                                !pending &&
                                !resize &&
                                Date.now() >= suppressClickUntil.current
                              )
                                planner.setEditing(session);
                            }}
                            onActions={(event) => openActions(event, session)}
                            onStart={() => void planner.startSession(session)}
                            onPause={() =>
                              planner.setConfirmation({
                                session,
                                action: 'pause',
                              })
                            }
                            onComplete={() =>
                              planner.setConfirmation({
                                session,
                                action: 'complete',
                              })
                            }
                            onTimer={() => planner.openTimer(session)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {drag && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-3">
          {[-1, 1].map((direction) => (
            <div
              key={direction}
              className="panel border-dashed px-5 py-3 text-sm"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                shiftDragged(direction);
              }}
            >
              {direction < 0 ? 'Önceki' : 'Sonraki'}{' '}
              {weekly ? 'haftaya' : 'güne'} taşı
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={!!actions}
        onClose={() => setActions(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0" />
        {actions && (
          <Dialog.Panel
            className="panel fixed w-56 p-2 shadow-lg"
            style={{ top: actions.y, left: actions.x }}
          >
            <Dialog.Title className="px-2 py-1 text-xs text-[var(--muted)]">
              Seans işlemleri
            </Dialog.Title>
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[var(--subtle)]"
              onClick={() => {
                planner.setEditing(actions.session);
                setActions(null);
              }}
            >
              <Edit className="h-4 w-4" />
              Düzenle
            </button>
            {actions.session.sessionType === 'pomodoro' && (
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[var(--subtle)]"
                onClick={() => {
                  planner.openTimer(actions.session);
                  setActions(null);
                }}
              >
                <Timer className="h-4 w-4" />
                Sayacı aç
              </button>
            )}
            <button
              disabled={!canRepositionSession(actions.session)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[var(--subtle)] disabled:opacity-40"
              onClick={() => {
                planner.setMoving(actions.session);
                setActions(null);
              }}
            >
              <MoveRight className="h-4 w-4" />
              Tarihe taşı
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red-600 hover:bg-[var(--subtle)]"
              onClick={() => {
                planner.setConfirmation({
                  session: actions.session,
                  action: 'delete',
                });
                setActions(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-[var(--subtle)]"
              onClick={() => setActions(null)}
            >
              <X className="h-4 w-4" />
              Kapat
            </button>
          </Dialog.Panel>
        )}
      </Dialog>
      <PomodoroModal
        isOpen={!!planner.timer}
        onClose={() => {
          planner.setTimer(null);
          planner.setMinimized(false);
        }}
        session={
          sessions.find((session) => session.id === planner.timer?.id) ??
          planner.timer
        }
        isMinimized={planner.minimized}
        onToggleMinimize={() => planner.setMinimized(!planner.minimized)}
      />
      <CreateSessionModal
        isOpen={!!planner.editing}
        editSession={planner.editing}
        onClose={() => planner.setEditing(null)}
      />
      <MoveSessionModal
        isOpen={!!planner.moving}
        onClose={() => {
          if (!pending) planner.setMoving(null);
        }}
        onSelectDate={(date) =>
          planner.moving ? planner.move(planner.moving, date) : false
        }
        pending={pending}
        sessionTitle={planner.moving?.title ?? ''}
        currentDate={
          planner.moving
            ? calendarViewDate(planner.moving.startTime, timezone)
            : planner.date
        }
      />
      <ConfirmDialog
        isOpen={!!planner.confirmation}
        onClose={() => {
          if (!pending) planner.setConfirmation(null);
        }}
        onConfirm={planner.confirm}
        title={
          planner.confirmation?.action === 'pause'
            ? 'Seansı duraklat'
            : planner.confirmation?.action === 'complete'
              ? 'Seansı tamamla'
              : 'Seansı sil'
        }
        message={
          planner.confirmation?.action === 'delete'
            ? `“${planner.confirmation.session.title}” ve bu seansın ölçüm kayıtları silinecek. Bu işlem geri alınamaz.`
            : 'Bu işlemi onaylıyor musunuz?'
        }
        type={planner.confirmation?.action === 'delete' ? 'danger' : 'info'}
      />
    </div>
  );
}
