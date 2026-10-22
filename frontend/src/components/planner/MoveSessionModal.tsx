import { useTerms } from '../../hooks/useTerms';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  calendarViewDate,
  sessionDurationLimits,
  isSessionDurationValid,
} from '@study-tracker/contracts';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from '../../utils/calendarDates';
import { orderedWeekdays } from '../../lib/locale';
import { useWeekStart } from '../../hooks/useWeekStart';
import { useText } from '../../store/languageStore';

interface MoveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (
    date: Date,
    changes?: { minute?: number; duration?: number },
  ) => void | boolean | Promise<void | boolean>;
  sessionDuration?: number | undefined;
  sourceUnavailable?: boolean;
  onReload?: (() => void) | undefined;
  pending?: boolean;
  sessionTitle: string;
  currentDate: Date;
}

const MoveSessionModal: React.FC<MoveSessionModalProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  sessionTitle,
  currentDate,
  pending = false,
  sessionDuration,
  sourceUnavailable = false,
  onReload,
}) => {
  const weekdays = useText().calendar.weekdaysShort;
  const t = useTerms();
  const weekStart = useWeekStart();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const today = calendarViewDate(new Date(), timezone);
  const isToday = (date: Date) => isSameDay(date, today);
  const [selectedMonth, setSelectedMonth] = useState(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editedTime, setTime] = useState<string | null>(null);
  const time = editedTime ?? format(currentDate, 'HH:mm');
  const [editedDuration, setDuration] = useState<string | null>(null);
  const duration = editedDuration ?? String(sessionDuration ?? 60);
  const [error, setError] = useState('');

  // A refreshed source must not clear the destination chosen by the user.
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentDate);
      setSelectedDate(null);
      setTime(null);
      setDuration(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const calendarStart = startOfWeek(monthStart, weekStart);
  const calendarEnd = endOfWeek(monthEnd, weekStart);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = async () => {
    if (pending || sourceUnavailable) return;
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      (sessionDuration !== undefined &&
        !isSessionDurationValid(Number(duration) * 60_000))
    ) {
      setError(
        'Saat ve süreyi kontrol edin. Süre 1 dakika ile 24 saat arasında olmalıdır.',
      );
      return;
    }
    setError('');
    const changes = {
      ...(editedTime === null
        ? {}
        : { minute: Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) }),
      ...(sessionDuration === undefined || editedDuration === null
        ? {}
        : { duration: Number(duration) }),
    };
    try {
      const result = await onSelectDate(selectedDate ?? currentDate, changes);
      if (result !== false) onClose();
      else
        setError(
          'Değişiklik kaydedilemedi. Taslağınız korunuyor; güncel bilgileri kontrol edip tekrar deneyin.',
        );
    } catch {
      setError('Değişiklik kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!pending) onClose();
      }}
      className="relative z-60"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className="panel max-h-[calc(100dvh-32px)] max-w-md w-full overflow-y-auto shadow-xl"
          aria-busy={pending}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-(--line)">
            <div>
              <DialogTitle className="text-base font-medium">
                Görevi Taşı
              </DialogTitle>
              <p className="text-sm text-(--muted) mt-1">
                {sessionTitle} · Taşınacak saat: {format(currentDate, 'HH:mm')}
              </p>
            </div>
            <button
              disabled={pending}
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 text-(--muted) hover:text-(--text) rounded-lg hover:bg-(--subtle)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {sourceUnavailable && (
            <div
              role="alert"
              className="space-y-2 border-b border-(--line) p-4 text-sm"
            >
              <p>
                Güncel {t.session()} okunamadı veya bu takvim aralığında bulunamadı.
                Kaydetmeden önce yeniden yükleyin.
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={onReload}
                className="btn btn-secondary"
              >
                {t.session({ case: 'acc', capitalize: true })} yeniden yükle
              </button>
            </div>
          )}
          {/* Calendar */}
          <div className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                disabled={pending}
                onClick={handlePrevMonth}
                aria-label="Önceki ay"
                className="p-2 rounded-lg hover:bg-(--subtle)"
              >
                <ChevronLeft className="h-5 w-5 text-(--muted)" />
              </button>
              <h3 className="text-base font-semibold ">
                {format(selectedMonth, 'MMMM yyyy')}
              </h3>
              <button
                disabled={pending}
                onClick={handleNextMonth}
                aria-label="Sonraki ay"
                className="p-2 rounded-lg hover:bg-(--subtle)"
              >
                <ChevronRight className="h-5 w-5 text-(--muted)" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {orderedWeekdays(weekStart).map((day) => weekdays[day]!).map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-(--muted) py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, selectedMonth);
                const isTodayDate = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDateDay = isSameDay(day, currentDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    disabled={pending || !isCurrentMonth}
                    aria-label={format(day, 'd MMMM yyyy')}
                    aria-pressed={!!isSelected}
                    className={`
                    relative p-2 text-sm rounded-lg transition-colors
                    ${!isCurrentMonth ? 'text-(--muted) cursor-not-allowed' : ''}
                    ${isCurrentMonth && !isSelected && !isTodayDate ? 'hover:bg-(--subtle)' : ''}
                    ${isTodayDate && !isSelected ? 'bg-(--subtle) text-(--text) font-medium' : ''}
                    ${isSelected ? 'bg-primary-600 text-white font-semibold' : ''}
                    ${isCurrentDateDay && !isSelected ? 'ring-1 ring-(--muted)' : ''}
                  `}
                  >
                    {format(day, 'd')}
                    {isCurrentDateDay && !isSelected && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-(--muted) rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Info */}
            {selectedDate && (
              <div className="mt-4 p-3 bg-(--subtle) rounded-lg">
                <p className="text-sm">
                  Seçilen tarih:{' '}
                  <span className="font-semibold">
                    {format(selectedDate, 'd MMMM yyyy, EEEE')}
                  </span>
                </p>
              </div>
            )}
          </div>

          {sessionDuration !== undefined && (
            <div className="space-y-3 border-t border-(--line) p-4">
              <p className="text-xs text-(--muted)">
                Tarihi değiştirmeden saat veya süreyi düzenleyebilirsiniz. Saat
                dilimi: {timezone}.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Başlangıç saati
                  <input
                    type="time"
                    className="input mt-1"
                    value={time}
                    disabled={pending}
                    onChange={(event) => {
                      setTime(
                        event.target.value === format(currentDate, 'HH:mm')
                          ? null
                          : event.target.value,
                      );
                      if (!selectedDate) setSelectedDate(currentDate);
                    }}
                  />
                </label>
                <label className="text-sm">
                  Planlanan süre (dakika)
                  <input
                    type="number"
                    className="input mt-1"
                    min={sessionDurationLimits.minMinutes}
                    max={sessionDurationLimits.maxMinutes}
                    step="any"
                    value={duration}
                    disabled={pending}
                    onChange={(event) => {
                      setDuration(
                        Number(event.target.value) === sessionDuration
                          ? null
                          : event.target.value,
                      );
                      if (!selectedDate) setSelectedDate(currentDate);
                    }}
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          )}
          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-(--line)">
            <button
              disabled={pending}
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              İptal
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={
                pending ||
                sourceUnavailable ||
                (!selectedDate &&
                  (sessionDuration === undefined ||
                    (time === format(currentDate, 'HH:mm') &&
                      Number(duration) === sessionDuration)))
              }
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Taşınıyor…' : 'Taşı'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default MoveSessionModal;
