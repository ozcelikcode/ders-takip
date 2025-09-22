import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, Target, Play, CheckCircle } from 'lucide-react';
import { StudySession } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays, parseISO, isToday, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface DailyCalendarProps {
  onCreateSession?: (date: Date, hour: number) => void;
  onSessionClick?: (session: StudySession) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

const DailyCalendar: React.FC<DailyCalendarProps> = ({ onCreateSession, onSessionClick }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['daily-sessions', selectedDate],
    queryFn: async () => {
      const dayStart = format(startOfDay(selectedDate), 'yyyy-MM-dd');
      const dayEnd = format(endOfDay(selectedDate), 'yyyy-MM-dd');
      const response = await studySessionsAPI.getSessions({
        startDate: dayStart,
        endDate: dayEnd,
      });
      return response.data.data.sessions;
    },
  });

  const getSessionsForHour = (hour: number): StudySession[] => {
    if (!sessionsData) return [];

    return sessionsData.filter((session) => {
      const sessionStart = parseISO(session.startTime);
      const sessionHour = sessionStart.getHours();
      const sessionMinutes = sessionStart.getMinutes();
      const sessionStartInMinutes = sessionHour * 60 + sessionMinutes;
      const slotStartInMinutes = hour * 60;
      const slotEndInMinutes = (hour + 1) * 60;

      return sessionStartInMinutes >= slotStartInMinutes && sessionStartInMinutes < slotEndInMinutes;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleTimeSlotClick = (hour: number) => {
    if (onCreateSession) {
      onCreateSession(selectedDate, hour);
    }
  };

  const getSessionTypeColor = (sessionType: string) => {
    switch (sessionType) {
      case 'study': return 'bg-blue-500 border-blue-600 text-white';
      case 'pomodoro': return 'bg-red-500 border-red-600 text-white';
      case 'review': return 'bg-green-500 border-green-600 text-white';
      case 'break': return 'bg-gray-500 border-gray-600 text-white';
      default: return 'bg-blue-500 border-blue-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'opacity-70 ring-2 ring-green-400';
      case 'in_progress': return 'ring-2 ring-yellow-400 animate-pulse';
      case 'cancelled': return 'opacity-40 bg-gray-400';
      default: return '';
    }
  };

  const calculateDayProgress = () => {
    if (!sessionsData || sessionsData.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = sessionsData.filter(s => s.status === 'completed').length;
    const total = sessionsData.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const getTotalStudyTime = () => {
    if (!sessionsData) return 0;

    return sessionsData
      .filter(session => session.status === 'completed')
      .reduce((total, session) => total + session.duration, 0);
  };

  const progress = calculateDayProgress();
  const totalStudyTime = getTotalStudyTime();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Günlük Takvim
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className={isToday(selectedDate) ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}>
              {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Bugün
            </button>
          )}
          <button
            onClick={() => navigateDate('next')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Günlük İlerleme</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {progress.completed}/{progress.total} seans
                </p>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Çalışma</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.floor(totalStudyTime / 60)}s {totalStudyTime % 60}d
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tamamlanma</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {progress.percentage}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        <div className="bg-white dark:bg-gray-800">
          {/* Time slots */}
          <div className="space-y-0">
            {HOURS.map((hour) => {
              const sessions = getSessionsForHour(hour);
              const nextHourSessions = getSessionsForHour(hour + 1);

              return (
                <div
                  key={hour}
                  className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Hour label */}
                  <div className="w-20 flex-shrink-0 p-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {hour}:00
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {hour + 1}:00
                    </div>
                  </div>

                  {/* Hour content */}
                  <div
                    className="flex-1 min-h-[80px] p-4 cursor-pointer relative"
                    onClick={() => handleTimeSlotClick(hour)}
                  >
                    <AnimatePresence>
                      {sessions.length === 0 ? (
                        <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-500 transition-colors">
                            <Plus className="w-4 h-4" />
                            <span>Seans ekle</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sessions.map((session, index) => (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                getSessionTypeColor(session.sessionType)
                              } ${getStatusColor(session.status)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSessionClick?.(session);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">
                                    {session.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-sm opacity-90 mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                                    </span>
                                    <span>({session.duration} dk)</span>
                                  </div>
                                  {session.description && (
                                    <p className="text-xs opacity-75 mt-1 truncate">
                                      {session.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {session.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  {session.status === 'planned' && (
                                    <Play className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                                  )}
                                  {session.sessionType === 'pomodoro' && (
                                    <Target className="w-4 h-4" />
                                  )}
                                </div>
                              </div>

                              {session.plan && (
                                <div className="mt-2 text-xs opacity-75">
                                  📋 {session.plan.title}
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Çalışma</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Pomodoro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Tekrar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Mola</span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default DailyCalendar;