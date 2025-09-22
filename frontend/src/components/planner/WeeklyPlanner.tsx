import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Play, Timer } from 'lucide-react';
import { StudySession, WeeklySchedule } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import PomodoroModal from './PomodoroModal';

interface WeeklyPlannerProps {
  onCreateSession?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ onCreateSession }) => {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedSession, setDraggedSession] = useState<StudySession | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ day: number; hour: number } | null>(null);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);

  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['study-sessions', currentWeek],
    queryFn: async () => {
      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      const response = await studySessionsAPI.getSessions({
        startDate: weekStart,
        endDate: weekEnd,
      });
      return response.data.data?.sessions || [];
    },
  });

  const organizeSessionsByWeek = (sessions: StudySession[]): WeeklySchedule => {
    const schedule: WeeklySchedule = {};

    DAYS.forEach((_, dayIndex) => {
      const dayKey = `day-${dayIndex}`;
      schedule[dayKey] = [];
    });

    sessions?.forEach((session) => {
      const sessionDate = parseISO(session.startTime);
      const dayIndex = (sessionDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      const dayKey = `day-${dayIndex}`;

      if (schedule[dayKey]) {
        schedule[dayKey].push(session);
      }
    });

    return schedule;
  };

  const weeklySchedule = organizeSessionsByWeek(sessionsData ?? []);

  const getSessionsForTimeSlot = (dayIndex: number, hour: number): StudySession[] => {
    const dayKey = `day-${dayIndex}`;
    const daySessions = weeklySchedule[dayKey] || [];

    return daySessions.filter((session) => {
      const sessionStart = parseISO(session.startTime);
      const sessionHour = sessionStart.getHours();
      const sessionMinutes = sessionStart.getMinutes();
      const sessionStartInMinutes = sessionHour * 60 + sessionMinutes;
      const slotStartInMinutes = hour * 60;
      const slotEndInMinutes = (hour + 1) * 60;

      return sessionStartInMinutes >= slotStartInMinutes && sessionStartInMinutes < slotEndInMinutes;
    });
  };

  const handleDragStart = (e: React.DragEvent, session: StudySession) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ day: dayIndex, hour });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    setDragOverTarget(null);

    if (!draggedSession) return;

    try {
      const targetDate = addDays(currentWeek, dayIndex);
      const newStartTime = new Date(targetDate);
      newStartTime.setHours(hour, 0, 0, 0);

      const sessionDuration = draggedSession.duration;
      const newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + sessionDuration);

      // Validate the session ID exists and is a valid number
      if (!draggedSession.id || isNaN(Number(draggedSession.id))) {
        throw new Error('Geçersiz oturum ID');
      }

      console.log('Frontend: Taşıma işlemi başlıyor');
      console.log('Frontend: Session ID:', draggedSession.id);
      console.log('Frontend: New start time:', newStartTime.toISOString());
      console.log('Frontend: New end time:', newEndTime.toISOString());

      // Show loading state
      toast.loading('Oturum taşınıyor...', { id: 'moving-session' });

      const response = await studySessionsAPI.updateSession(draggedSession.id.toString(), {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });

      console.log('Frontend: API Response:', response.data);

      if (response.data.success) {
        toast.success('Oturum başarıyla taşındı', { id: 'moving-session' });
        refetch();
      } else {
        throw new Error(response.data.error?.message || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      console.error('Error moving session:', error);

      let errorMessage = 'Oturum taşınırken hata oluştu';

      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: 'moving-session' });
    }

    setDraggedSession(null);
  };

  const handleTimeSlotClick = (dayIndex: number, hour: number) => {
    if (onCreateSession) {
      const targetDate = addDays(currentWeek, dayIndex);
      const sessionDate = new Date(targetDate);
      sessionDate.setHours(hour, 0, 0, 0);
      onCreateSession(sessionDate, hour);
    }
  };

  const handleSessionClick = (e: React.MouseEvent, session: StudySession) => {
    e.stopPropagation();

    if (session.sessionType === 'pomodoro') {
      setActiveSession(session);
      setIsPomodoroModalOpen(true);
    } else {
      // For non-Pomodoro sessions, just start them
      studySessionsAPI.startSession(session.id.toString())
        .then(() => {
          toast.success('Çalışma seansı başlatıldı');
          refetch();
        })
        .catch(() => {
          toast.error('Seans başlatılırken hata oluştu');
        });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const getSessionTypeColor = (sessionType: string) => {
    switch (sessionType) {
      case 'study': return 'bg-blue-500 border-blue-600';
      case 'pomodoro': return 'bg-red-500 border-red-600';
      case 'review': return 'bg-green-500 border-green-600';
      case 'break': return 'bg-gray-500 border-gray-600';
      default: return 'bg-blue-500 border-blue-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'opacity-60 line-through';
      case 'in_progress': return 'ring-2 ring-yellow-400';
      case 'cancelled': return 'opacity-40 bg-gray-400';
      default: return '';
    }
  };

  // Handle error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <Calendar className="w-16 h-16 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Veriler yüklenirken hata oluştu</h3>
          <p className="text-gray-600 mt-2">Planlayıcı verileri alınamadı</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-primary"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Haftalık Planlayıcı
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {format(currentWeek, 'd MMMM', { locale: tr })} - {format(addDays(currentWeek, 6), 'd MMMM yyyy', { locale: tr })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Bugün
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="card overflow-hidden">
        <div className="bg-white dark:bg-gray-800 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              {DAYS.map((day, index) => {
                const dayDate = addDays(currentWeek, index);
                const isCurrentDay = isToday(dayDate);

                return (
                  <div
                    key={day}
                    className={`p-4 text-center border-r border-gray-200 dark:border-gray-700 ${
                      isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {day}
                    </div>
                    <div className={`text-xs ${isCurrentDay ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {format(dayDate, 'd MMM', { locale: tr })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
                {/* Hour label */}
                <div className="p-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 text-center">
                  {hour}:00
                </div>

                {/* Day columns */}
                {DAYS.map((_, dayIndex) => {
                  const sessions = getSessionsForTimeSlot(dayIndex, hour);
                  const isDragOver = dragOverTarget?.day === dayIndex && dragOverTarget?.hour === hour;
                  const dayDate = addDays(currentWeek, dayIndex);
                  const isCurrentDay = isToday(dayDate);

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`relative min-h-[60px] border-r border-gray-200 dark:border-gray-700 transition-colors ${
                        isDragOver ? 'bg-blue-100 dark:bg-blue-900/30' :
                        isCurrentDay ? 'bg-blue-50/50 dark:bg-blue-900/10' :
                        'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIndex, hour)}
                      onClick={() => handleTimeSlotClick(dayIndex, hour)}
                    >
                      <AnimatePresence>
                        {sessions.map((session, sessionIndex) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute inset-x-1 top-1 p-2 rounded border text-xs text-white cursor-move ${
                              getSessionTypeColor(session.sessionType)
                            } ${getStatusColor(session.status)} group`}
                            style={{
                              top: `${4 + sessionIndex * 28}px`,
                              zIndex: draggedSession?.id === session.id ? 50 : 10,
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, session)}
                            onClick={(e) => handleSessionClick(e, session)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{session.title}</div>
                                {session.duration && (
                                  <div className="opacity-75">{session.duration} dk</div>
                                )}
                              </div>
                              {session.sessionType === 'pomodoro' && (
                                <Timer className="w-3 h-3 ml-1 opacity-75 group-hover:opacity-100" />
                              )}
                              {session.status === 'planned' && (
                                <Play className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Add session button */}
                      {sessions.length === 0 && (
                        <button
                          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
                          onClick={() => handleTimeSlotClick(dayIndex, hour)}
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
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

      {/* Pomodoro Timer Modal */}
      <PomodoroModal
        isOpen={isPomodoroModalOpen}
        onClose={() => {
          setIsPomodoroModalOpen(false);
          setActiveSession(null);
          setIsTimerMinimized(false);
        }}
        session={activeSession}
        isMinimized={isTimerMinimized}
        onToggleMinimize={() => setIsTimerMinimized(!isTimerMinimized)}
      />
    </div>
  );
};

export default WeeklyPlanner;