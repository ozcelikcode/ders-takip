import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Play, CheckCircle, MoveRight, MoveLeft, Edit, Pause, Trash2 } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { StudySession } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, parseISO, isToday, setHours, setMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import PomodoroModal from './PomodoroModal';
import ConfirmDialog from '../common/ConfirmDialog';
import MoveSessionModal from './MoveSessionModal';
import CreateSessionModal from './CreateSessionModal';
import { canStartSession, formatTime } from '../../utils/sessionHelpers';

// Robust date parsing for various formats
const parseDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  const parsed = parseISO(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  // Fallback for non-standard formats (e.g., with spaces)
  const fallback = new Date(dateStr.replace(' ', 'T'));
  return isNaN(fallback.getTime()) ? new Date(dateStr) : fallback;
};

interface DailyCalendarProps {
  onCreateSession?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // Full 24 hours: 0:00 to 23:00

// Helper function to adjust color brightness for gradient
const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const DailyCalendar: React.FC<DailyCalendarProps> = ({ onCreateSession }) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draggedSession, setDraggedSession] = useState<StudySession | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOverTarget, setDragOverTarget] = useState<{ hour: number; minute: number } | null>(null);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resizingSession, setResizingSession] = useState<{ session: StudySession; startY: number; startHeight: number } | null>(null);
  // resizePreview state removed
  const [justFinishedAction, setJustFinishedAction] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ session: StudySession; x: number; y: number } | null>(null);
  const [moveModalSession, setMoveModalSession] = useState<StudySession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    return () => {
      // Cleanup
    };
  }, []);

  const { data: sessionsData, refetch } = useQuery({
    queryKey: ['daily-sessions', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const dayStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await studySessionsAPI.getSessions({
        startDate: dayStr,
        endDate: dayStr,
      });
      return response.data.data?.sessions || [];
    },
  });

  // Vakti geçmiş in_progress oturumları kontrol et ve otomatik yenile
  useEffect(() => {
    const checkOverdueSessions = () => {
      if (!sessionsData || sessionsData.length === 0) return;

      const now = new Date();
      const overdueSessions = sessionsData.filter(
        (session) =>
          session.status === 'in_progress' &&
          parseDate(session.endTime) < now
      );

      if (overdueSessions.length > 0) {
        console.log('⏰ Vakti geçmiş oturumlar bulundu, yenileniyor...', overdueSessions.length);
        refetch(); // Backend otomatik cancel edecek
      }
    };

    checkOverdueSessions();
    const interval = setInterval(checkOverdueSessions, 30000);
    return () => clearInterval(interval);
  }, [sessionsData, refetch]);

  const getSessionsForTimeSlot = (hour: number): StudySession[] => {
    if (!sessionsData) return [];
    return sessionsData.filter((session) => {
      const sessionStart = parseDate(session.startTime);
      const sessionHour = sessionStart.getHours();
      return sessionHour === hour;
    });
  };

  const handleDragStart = (e: React.DragEvent, session: StudySession) => {
    if (session.status === 'in_progress' || session.status === 'completed') {
      e.preventDefault();
      toast.error('Devam eden veya tamamlanmış oturumlar taşınamaz');
      return;
    }

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const sessionHeight = rect.height;

    if (sessionHeight >= 20 && offsetY > sessionHeight - 12) {
      e.preventDefault();
      return;
    }

    setDraggedSession(session);
    setDragOffset(offsetY);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const timeSlot = (e.currentTarget as HTMLElement);
    const rect = timeSlot.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const slotHeight = rect.height;

    const sessionStartY = mouseY - dragOffset;
    const minutesFromTop = (sessionStartY / slotHeight) * 60;
    const snappedMinutes = Math.round(minutesFromTop / 15) * 15;

    setDragOverTarget({ hour, minute: snappedMinutes });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    if (!draggedSession || isMoving) return;

    const snappedMinutes = dragOverTarget?.minute ?? 0;
    setDragOverTarget(null);

    try {
      setIsMoving(true);
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hour, snappedMinutes, 0, 0);

      const sessionDuration = draggedSession.duration;
      let newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + sessionDuration);

      const sessionDay = new Date(newStartTime);
      sessionDay.setHours(23, 59, 59, 999);

      if (newEndTime > sessionDay) {
        toast.error('Görev gece yarısını geçemez. Görev bu konuma taşınamaz.');
        throw new Error('Session cannot extend past midnight');
      }

      toast.loading('Oturum taşınıyor...', { id: 'moving-session' });
      const response = await studySessionsAPI.updateSession(draggedSession.id.toString(), {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });

      if (response.data.success) {
        toast.success('Oturum başarıyla taşındı', { id: 'moving-session' });
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
        await refetch();
      } else {
        throw new Error(response.data.error?.message || 'Bilinmeyen hata');
      }
    } catch (error: any) {
      toast.error(error.message || 'Oturum taşınırken hata oluştu', { id: 'moving-session' });
    } finally {
      setIsMoving(false);
      setDraggedSession(null);
      setJustFinishedAction(true);
      setTimeout(() => setJustFinishedAction(false), 100);
    }
  };

  const handleTimeSlotClick = (hour: number) => {
    if (justFinishedAction) return;
    if (onCreateSession) {
      const sessionDate = new Date(selectedDate);
      sessionDate.setHours(hour, 0, 0, 0);
      onCreateSession(sessionDate, hour);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, session: StudySession) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ session, x: e.clientX, y: e.clientY });
  };

  const handleEditSession = (session: StudySession) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  const handleMoveToDate = async (targetDate: Date) => {
    if (!moveModalSession) return;
    try {
      setIsMoving(true);
      toast.loading('Oturum taşınıyor...', { id: 'moving-session' });
      const sessionStart = parseDate(moveModalSession.startTime);
      const newStartTime = setHours(setMinutes(targetDate, sessionStart.getMinutes()), sessionStart.getHours());
      const newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + moveModalSession.duration);

      const response = await studySessionsAPI.updateSession(moveModalSession.id.toString(), {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });

      if (response.data.success) {
        toast.success('Oturum başarıyla taşındı', { id: 'moving-session' });
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
        await refetch();
        setMoveModalSession(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Oturum taşınırken hata oluştu', { id: 'moving-session' });
    } finally {
      setIsMoving(false);
    }
  };

  const handleStartSession = async (session: StudySession) => {
    if (!canStartSession(session)) {
      toast.error('Bu oturum için zaman geçmiş. Lütfen oturum saatini güncelleyin.');
      return;
    }
    try {
      await studySessionsAPI.startSession(session.id.toString());
      toast.success('Çalışma seansı başlatıldı');
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
      refetch();
    } catch (error) {
      toast.error('Seans başlatılırken hata oluştu');
    }
  };

  const handlePauseSession = (session: StudySession) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Oturumu Duraklat',
      message: 'Bu oturumu duraklatmak istiyor musunuz?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await studySessionsAPI.pauseSession(session.id.toString());
          toast.success('Çalışma seansı duraklatıldı');
          queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
          refetch();
        } catch (error) {
          toast.error('Seans duraklatılırken hata oluştu');
        }
      },
    });
  };

  const handleCompleteSession = (session: StudySession) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Oturumu Tamamla',
      message: 'Bu oturumu tamamlandı olarak işaretlemek istiyor musunuz?',
      type: 'info',
      onConfirm: async () => {
        try {
          await studySessionsAPI.completeSession(session.id.toString());
          toast.success('Çalışma seansı tamamlandı');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
          refetch();
        } catch (error) {
          toast.error('Seans tamamlanırken hata oluştu');
        }
      },
    });
  };

  // handleRestartSession removed

  const handleStartPomodoro = (session: StudySession) => {
    if (!canStartSession(session)) {
      toast.error('Bu oturum için zaman geçmiş. Lütfen oturum saatini güncelleyin.');
      return;
    }
    setActiveSession(session);
    setIsPomodoroModalOpen(true);
  };

  const handleResizeStart = (e: React.MouseEvent, session: StudySession, currentHeight: number) => {
    e.stopPropagation();
    setResizingSession({ session, startY: e.clientY, startHeight: currentHeight });
  };

  useEffect(() => {
    if (resizingSession) {
      const handleMouseMoveEvent = (e: MouseEvent) => {
        const deltaY = e.clientY - resizingSession.startY;
        let newHeight = resizingSession.startHeight + deltaY;
        newHeight = Math.max(5, newHeight);
        // minutesSnapped removed
        // setResizePreview removed
      };

      const handleMouseUpEvent = async (e: MouseEvent) => {
        const deltaY = e.clientY - resizingSession.startY;
        let newHeight = resizingSession.startHeight + deltaY;
        newHeight = Math.max(5, newHeight);
        let newDuration = Math.max(5, Math.round(newHeight / 5) * 5);

        const sessionStart = parseDate(resizingSession.session.startTime);
        const newEndTime = new Date(sessionStart);
        newEndTime.setMinutes(sessionStart.getMinutes() + newDuration);

        const sessionDay = new Date(sessionStart);
        sessionDay.setHours(23, 59, 59, 999);

        if (newEndTime > sessionDay) {
          newEndTime.setTime(sessionDay.getTime());
          newDuration = Math.floor((newEndTime.getTime() - sessionStart.getTime()) / (1000 * 60));
          toast.error('Görev gece yarısını geçemez (23:59)');
        }

        setResizingSession(null);
        setJustFinishedAction(true);
        setTimeout(() => setJustFinishedAction(false), 100);

        try {
          await studySessionsAPI.updateSession(resizingSession.session.id.toString(), {
            endTime: newEndTime.toISOString(),
          });
          toast.success('Süre güncellendi');
          queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
          refetch();
        } catch (error) {
          toast.error('Süre güncellenirken hata oluştu');
        }
      };

      window.addEventListener('mousemove', handleMouseMoveEvent);
      window.addEventListener('mouseup', handleMouseUpEvent);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveEvent);
        window.removeEventListener('mouseup', handleMouseUpEvent);
      };
    }
    return undefined;
  }, [resizingSession, queryClient, refetch]);

  const getStatusColor = (status: string, sessionEndTime: string) => {
    const now = new Date();
    const sessionEnd = parseDate(sessionEndTime);
    const isPast = sessionEnd < now;

    switch (status) {
      case 'completed': return 'opacity-60 ring-2 ring-green-400';
      case 'in_progress':
        return isPast ? 'ring-2 ring-red-400 animate-pulse' : 'ring-2 ring-yellow-400 animate-pulse';
      case 'paused': return 'ring-2 ring-orange-400 text-white/90';
      case 'cancelled': return 'opacity-40 bg-gray-400';
      case 'planned': return isPast ? 'opacity-70' : '';
      default: return '';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Günlük Planlayıcı</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span className={isToday(selectedDate) ? 'font-semibold text-primary-600' : ''}>
              {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateDate('prev')} className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1 text-sm font-medium text-primary-600">Bugün</button>
          <button onClick={() => navigateDate('next')} className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="bg-white dark:bg-gray-800">
          <div className="grid grid-cols-1">
            {HOURS.map((hour) => {
              const sessions = getSessionsForTimeSlot(hour);
              const currentHour = currentTime.getHours();
              const isCurrentHour = isToday(selectedDate) && hour === currentHour;
              const timeIndicatorPos = (currentTime.getMinutes() / 60) * 100;

              return (
                <div key={hour} className="flex border-b border-gray-100 dark:border-gray-700/50 min-h-[64px] relative group">
                  <div className="w-20 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700/50">
                    <span className="text-sm font-medium text-gray-500">{`${hour.toString().padStart(2, '0')}:00`}</span>
                  </div>
                  <div
                    className="flex-1 relative p-1 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                    onClick={() => handleTimeSlotClick(hour)}
                    onDragOver={(e) => handleDragOver(e, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, hour)}
                  >
                    {isCurrentHour && (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${timeIndicatorPos}%` }}>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="flex-1 h-0.5 bg-red-500/50"></div>
                      </div>
                    )}
                    {dragOverTarget?.hour === hour && (
                      <div className="absolute inset-x-1 border-2 border-dashed border-primary-500 rounded-xl bg-primary-500/5 z-10 pointer-events-none" style={{ top: `${(dragOverTarget.minute / 60) * 100}%`, height: `${(draggedSession?.duration || 30) / 60 * 100}%` }} />
                    )}
                    {sessions.map((session) => {
                      const isBeingDragged = draggedSession?.id === session.id;
                      const sessionStart = parseDate(session.startTime);
                      const sessionMinutes = sessionStart.getMinutes();
                      const topPosition = (sessionMinutes / 60) * 100;
                      const sessionHeight = (session.duration / 60) * 64;

                      return (
                        <motion.div
                          key={session.id}
                          layoutId={`session-${session.id}`}
                          className={`absolute inset-x-1 p-1.5 rounded-xl shadow-sm border text-white transition-all overflow-hidden ${getStatusColor(session.status, session.endTime)} ${isBeingDragged ? 'opacity-30' : ''}`}
                          style={{
                            top: `${topPosition}%`,
                            height: `${sessionHeight}px`,
                            backgroundColor: session.color || '#3B82F6',
                            borderColor: adjustColor(session.color || '#3B82F6', -20),
                            zIndex: isBeingDragged ? 50 : 10,
                          }}
                          draggable={session.status !== 'in_progress'}
                          onDragStart={(e) => handleDragStart(e as any, session)}
                          onDragEnd={() => { setDraggedSession(null); setDragOverTarget(null); }}
                          onContextMenu={(e) => handleContextMenu(e, session)}
                          onClick={(e) => { e.stopPropagation(); handleEditSession(session); }}
                        >
                          <div className="flex flex-col h-full overflow-hidden">
                            {/* Header: Time + Status Icons */}
                            <div className="flex items-center justify-between mb-0.5 shrink-0">
                              <span className="text-[9px] font-bold bg-black/20 px-1.5 py-0.5 rounded leading-none whitespace-nowrap uppercase tracking-wider">
                                {formatTime(session.startTime)}
                              </span>
                              <div className="flex gap-0.5">
                                {session.status === 'planned' && canStartSession(session) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      session.sessionType === 'pomodoro' ? handleStartPomodoro(session) : handleStartSession(session);
                                    }}
                                    className="p-0.5 hover:bg-white/20 rounded-md transition-all"
                                  >
                                    <Play className="w-3 h-3" />
                                  </button>
                                )}
                                {session.status === 'in_progress' && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handlePauseSession(session); }} className="p-0.5 hover:bg-white/20 rounded-md transition-all"><Pause className="w-3 h-3" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleCompleteSession(session); }} className="p-0.5 hover:bg-white/20 rounded-md transition-all"><CheckCircle className="w-3 h-3" /></button>
                                  </>
                                )}
                                {session.status === 'paused' && (
                                  <button onClick={(e) => { e.stopPropagation(); handleStartSession(session); }} className="p-0.5 hover:bg-white/20 rounded-md transition-all"><Play className="w-3 h-3" /></button>
                                )}
                              </div>
                            </div>

                            {/* Title & Description */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="font-bold text-xs truncate leading-tight">{session.title}</div>
                              {sessionHeight >= 50 && (
                                <div className="text-[9px] opacity-80 truncate leading-tight mt-0.5">
                                  {session.duration} dk
                                </div>
                              )}
                            </div>
                          </div>
                          {session.status !== 'in_progress' && session.status !== 'completed' && (
                            <div
                              className="absolute bottom-0 left-0 right-0 cursor-ns-resize hover:bg-white/10 h-2 group/resize flex items-center justify-center transition-colors"
                              onMouseDown={(e) => handleResizeStart(e, session, sessionHeight)}
                            ><div className="w-6 h-0.5 bg-white/40 rounded-full opacity-0 group-hover/resize:opacity-100 transition-opacity" /></div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Drop Zones */}
      <AnimatePresence>
        {draggedSession && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-row gap-6 items-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="w-56 p-4 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md flex flex-col items-center gap-2 shadow-xl pointer-events-auto hover:border-primary-500 transition-all"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50', 'scale-105'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50', 'scale-105')}
              onDrop={async (e) => {
                e.preventDefault();
                const newStart = subDays(parseDate(draggedSession.startTime), 1);
                const newEnd = subDays(parseDate(draggedSession.endTime), 1);
                try {
                  toast.loading('Önceki güne taşınıyor...', { id: 'move-day' });
                  await studySessionsAPI.updateSession(draggedSession.id.toString(), { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
                  toast.success('Önceki güne taşındı', { id: 'move-day' });
                  queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
                  refetch();
                } catch (err) { toast.error('Hata oluştu', { id: 'move-day' }); }
                setDraggedSession(null);
              }}
            >
              <MoveLeft className="w-5 h-5 rotate-[45deg] text-gray-500" />
              <p className="font-bold text-gray-600 text-sm">Önceki Gün</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} transition={{ delay: 0.1 }}
              className="w-56 p-4 rounded-2xl border-2 border-dashed border-primary-400 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md flex flex-col items-center gap-2 shadow-2xl pointer-events-auto hover:border-primary-500 transition-all"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50', 'scale-105'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50', 'scale-105')}
              onDrop={async (e) => {
                e.preventDefault();
                const newStart = addDays(parseDate(draggedSession.startTime), 1);
                const newEnd = addDays(parseDate(draggedSession.endTime), 1);
                try {
                  toast.loading('Sonraki güne taşınıyor...', { id: 'move-day' });
                  await studySessionsAPI.updateSession(draggedSession.id.toString(), { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
                  toast.success('Sonraki güne taşındı', { id: 'move-day' });
                  queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
                  refetch();
                } catch (err) { toast.error('Hata oluştu', { id: 'move-day' }); }
                setDraggedSession(null);
              }}
            >
              <div className="p-1.5 rounded-full bg-primary-100 text-primary-600"><MoveRight className="w-5 h-5 rotate-[-45deg]" /></div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Sonraki Gün</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[110] min-w-[160px]" style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
          <button onClick={() => { handleEditSession(contextMenu.session); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"><Edit className="w-4 h-4" /> Düzenle</button>
          <button onClick={() => { setMoveModalSession(contextMenu.session); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"><MoveRight className="w-4 h-4" /> Tarihe Taşı</button>
          <div className="border-t my-1" />
          <button onClick={() => { setConfirmDialog({ isOpen: true, title: 'Görevi Sil', message: `"${contextMenu.session.title}" görevini silmek istiyor musunuz?`, type: 'danger', onConfirm: async () => { try { await studySessionsAPI.deleteSession(contextMenu.session.id.toString()); toast.success('Silindi'); refetch(); } catch (e) { toast.error('Hata'); } } }); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Sil</button>
        </div>
      )}

      {/* Modals */}
      <PomodoroModal isOpen={isPomodoroModalOpen} onClose={() => { setIsPomodoroModalOpen(false); setActiveSession(null); }} session={activeSession} isMinimized={isTimerMinimized} onToggleMinimize={() => setIsTimerMinimized(!isTimerMinimized)} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type || 'info'} />
      <CreateSessionModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingSession(null); refetch(); }} editSession={editingSession} />
      <MoveSessionModal isOpen={!!moveModalSession} onClose={() => setMoveModalSession(null)} onSelectDate={handleMoveToDate} sessionTitle={moveModalSession?.title || ''} currentDate={moveModalSession ? parseDate(moveModalSession.startTime) : new Date()} />
    </div>
  );
};

export default DailyCalendar;