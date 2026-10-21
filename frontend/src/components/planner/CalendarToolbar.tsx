import type { RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from '../../utils/calendarDates';

interface CalendarToolbarProps {
  weekly: boolean;
  days: readonly Date[];
  pending: boolean;
  dragging: boolean;
  todayButtonRef: RefObject<HTMLButtonElement>;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onHoverDirection: (direction: number | null) => void;
  onDropOnNavigation: () => void;
}

export default function CalendarToolbar({
  weekly,
  days,
  pending,
  dragging,
  todayButtonRef,
  onNavigate,
  onToday,
  onHoverDirection,
  onDropOnNavigation,
}: CalendarToolbarProps) {
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-title">
        <h2 className="text-sm font-medium">
          {weekly ? 'Haftalık Planlayıcı' : 'Günlük Planlayıcı'}
        </h2>
        <p className="text-xs text-(--muted)">
          {weekly
            ? `${format(days[0]!, 'd MMMM')} – ${format(days[6]!, 'd MMMM yyyy')}`
            : format(days[0]!, 'd MMMM yyyy, EEEE')}
        </p>
      </div>
      <div className="date-navigation">
        {[-1, 0, 1].map((direction) => (
          <button
            key={direction}
            ref={direction === 0 ? todayButtonRef : undefined}
            disabled={pending}
            className="btn btn-secondary"
            aria-label={
              direction
                ? `${direction < 0 ? 'Önceki' : 'Sonraki'} ${weekly ? 'hafta' : 'gün'}`
                : 'Bugün'
            }
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
              'Bugün'
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
