import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { SeriesRecord } from '@study-tracker/contracts';
import { useQuery } from '@tanstack/react-query';
import { Repeat, X } from 'lucide-react';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useTerms } from '../../hooks/useTerms';
import { useWeekStart } from '../../hooks/useWeekStart';
import { orderedWeekdays, useLocale } from '../../lib/locale';
import { seriesAPI } from '../../services/api';
import { useText } from '../../store/languageStore';

interface RoutinesDialogProps {
  onClose: () => void;
  onEdit: (series: SeriesRecord) => void;
}

/** The person's weekly routines, each opening the routine form to change or end it. */
export default function RoutinesDialog({ onClose, onEdit }: RoutinesDialogProps) {
  const t = useTerms();
  const { planner: text, calendar, common } = useText();
  const { tag } = useLocale();
  const weekStart = useWeekStart();
  const keys = useAccountQueryKeys();
  const routines = useQuery({ queryKey: keys.sessions('routines'), queryFn: seriesAPI.list });
  const schedule = (series: SeriesRecord) =>
    text.routineSchedule(
      orderedWeekdays(weekStart).filter((day) => series.weekdays.includes(day)).map((day) => calendar.weekdaysShort[day]).join(', '),
      series.startTime,
      common.minutesShort(series.durationMinutes),
      series.endsOn
        ? new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${series.endsOn}T00:00:00Z`))
        : null,
    );

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="panel mx-auto my-8 w-full max-w-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-(--line) p-5">
            <DialogTitle className="text-lg font-medium">{text.routinesTitle}</DialogTitle>
            <button type="button" onClick={onClose} aria-label={text.closeRoutines} className="icon-button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 p-5">
            <p className="text-sm text-(--muted)">{text.routinesHint(t)}</p>
            {routines.isPending ? (
              <p role="status" className="text-sm">{text.routinesLoading}</p>
            ) : routines.isError ? (
              <p role="alert" className="text-sm text-red-600">{text.routinesFailed}</p>
            ) : !routines.data.length ? (
              <p className="text-sm text-(--muted)">{text.noRoutines}</p>
            ) : (
              <ul className="divide-y divide-(--line) rounded-lg border border-(--line)">
                {routines.data.map((series) => (
                  <li key={series.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        <Repeat className="h-3.5 w-3.5 shrink-0 text-(--muted)" aria-hidden="true" />
                        {series.title}
                      </p>
                      <p className="mt-1 text-xs text-(--muted)">{schedule(series)}</p>
                    </div>
                    <button type="button" className="btn btn-secondary shrink-0" aria-label={text.editRoutine(series.title)} onClick={() => onEdit(series)}>
                      {text.edit}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
