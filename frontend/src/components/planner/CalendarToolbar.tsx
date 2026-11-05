import type { RefObject } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Maximize2,
  Minimize2,
  Redo2,
  Undo2,
} from 'lucide-react';
import { format } from '../../utils/calendarDates';
import { useText } from '../../store/languageStore';
import type { CalendarMode } from './calendarGeometry';

interface CalendarToolbarProps {
  mode: CalendarMode;
  /** The day the view is anchored on; a month view shows the month of this day. */
  date: Date;
  days: readonly Date[];
  pending: boolean;
  dragging: boolean;
  expanded: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToggleExpanded: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShortcuts: () => void;
  onViewChange?: ((mode: CalendarMode) => void) | undefined;
  todayButtonRef: RefObject<HTMLButtonElement | null>;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onHoverDirection: (direction: number | null) => void;
  onDropOnNavigation: () => void;
}

/** One row above the calendar: the range and its navigation on the left, the view and tools on the right. */
export default function CalendarToolbar({
  mode,
  date,
  days,
  pending,
  dragging,
  expanded,
  canUndo,
  canRedo,
  onToggleExpanded,
  onUndo,
  onRedo,
  onShortcuts,
  onViewChange,
  todayButtonRef,
  onNavigate,
  onToday,
  onHoverDirection,
  onDropOnNavigation,
}: CalendarToolbarProps) {
  const text = useText().planner;
  const views = [
    { mode: 'daily', label: text.daily, icon: Calendar },
    { mode: 'weekly', label: text.weekly, icon: CalendarDays },
    { mode: 'monthly', label: text.monthly, icon: CalendarRange },
  ] as const;
  const previous = mode === 'monthly' ? text.previousMonth : mode === 'weekly' ? text.previousWeek : text.previousDay;
  const next = mode === 'monthly' ? text.nextMonth : mode === 'weekly' ? text.nextWeek : text.nextDay;
  const tool = 'btn btn-secondary px-2.5';
  return (
    // Phones: the range on its own line, then navigation and tools; wider screens: one row.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="date-navigation">
          {[-1, 0, 1].map((direction) => (
            <button
              key={direction}
              type="button"
              ref={direction === 0 ? todayButtonRef : undefined}
              disabled={pending}
              className="btn btn-secondary"
              aria-label={direction ? (direction < 0 ? previous : next) : text.today}
              onClick={() => (direction ? onNavigate(direction) : onToday())}
              onDragOver={(event) => {
                if (dragging && direction) {
                  event.preventDefault();
                  onHoverDirection(direction);
                }
              }}
              onDragLeave={() => onHoverDirection(null)}
              onDrop={(event) => {
                event.preventDefault();
                if (direction) onNavigate(direction);
                onDropOnNavigation();
              }}
            >
              {direction === -1 ? (
                <ChevronLeft className="h-4 w-4" />
              ) : direction === 1 ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                text.today
              )}
            </button>
          ))}
        </div>
        <div className="calendar-toolbar-title order-first basis-full sm:order-none sm:basis-auto">
          <h2 className="text-sm font-medium">
            {mode === 'monthly' ? text.monthlyTitle : mode === 'weekly' ? text.weeklyTitle : text.dailyTitle}
          </h2>
          <p className="text-xs text-(--muted)">
            {mode === 'monthly'
              ? format(date, 'MMMM yyyy')
              : mode === 'weekly'
                ? `${format(days[0], 'd MMMM')} – ${format(days[6], 'd MMMM yyyy')}`
                : format(days[0], 'd MMMM yyyy, EEEE')}
          </p>
        </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {onViewChange && (
          <div className="segmented-control" role="group" aria-label={text.view}>
            {views.map(({ mode: view, label, icon: Icon }) => (
              <button
                key={view}
                type="button"
                onClick={() => onViewChange(view)}
                aria-pressed={mode === view}
                aria-label={label}
                title={label}
                className={`segment ${mode === view ? 'segment-active' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" className={tool} disabled={pending || !canUndo} aria-label={text.undo} title={text.undoTitle} onClick={onUndo}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" className={tool} disabled={pending || !canRedo} aria-label={text.redo} title={text.redoTitle} onClick={onRedo}>
          <Redo2 className="h-4 w-4" />
        </button>
        <button type="button" className={`${tool} hidden sm:inline-flex`} aria-label={text.shortcuts} title={`${text.shortcuts} (?)`} onClick={onShortcuts}>
          <Keyboard className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={tool}
          aria-pressed={expanded}
          aria-label={expanded ? text.exitFullscreen : text.fullscreen}
          title={`${expanded ? text.exitFullscreen : text.fullscreen} (F)`}
          onClick={onToggleExpanded}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
