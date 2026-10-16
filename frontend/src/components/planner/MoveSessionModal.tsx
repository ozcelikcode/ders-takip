import { Dialog } from '@headlessui/react';
import { calendarViewDate } from '@study-tracker/contracts';
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
import { tr } from 'date-fns/locale';

interface MoveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void | boolean | Promise<void | boolean>;
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
}) => {
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const today = calendarViewDate(new Date(), timezone);
  const isToday = (date: Date) => isSameDay(date, today);
  const [selectedMonth, setSelectedMonth] = useState(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // A refreshed source must not clear the destination chosen by the user.
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentDate);
      setSelectedDate(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = async () => {
    if (!selectedDate || pending) return;
    const result = await onSelectDate(selectedDate);
    if (result !== false) onClose();
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
      className="relative z-[60]"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className="panel max-w-md w-full shadow-xl"
          aria-busy={pending}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <Dialog.Title className="text-base font-medium">
                Görevi Taşı
              </Dialog.Title>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sessionTitle} · Taşınacak saat: {format(currentDate, 'HH:mm')}
              </p>
            </div>
            <button
              disabled={pending}
              onClick={onClose}
              aria-label="Kapat"
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar */}
          <div className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                aria-label="Önceki ay"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                {format(selectedMonth, 'MMMM yyyy', { locale: tr })}
              </h4>
              <button
                onClick={handleNextMonth}
                aria-label="Sonraki ay"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
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
                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : ''}
                    ${isCurrentMonth && !isSelected && !isTodayDate ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${isTodayDate && !isSelected ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold' : ''}
                    ${isSelected ? 'bg-primary-600 text-white font-semibold' : ''}
                    ${isCurrentDateDay && !isSelected ? 'ring-1 ring-[var(--muted)]' : ''}
                  `}
                  >
                    {format(day, 'd')}
                    {isCurrentDateDay && !isSelected && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[var(--muted)] rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Date Info */}
            {selectedDate && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Seçilen tarih:{' '}
                  <span className="font-semibold">
                    {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              disabled={pending}
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              İptal
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={pending || !selectedDate}
              className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? 'Taşınıyor…' : 'Taşı'}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default MoveSessionModal;
