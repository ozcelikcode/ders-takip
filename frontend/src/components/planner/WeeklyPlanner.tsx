import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Play, Timer, Square, RotateCcw, CheckCircle, MoveRight, Edit, Pause } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySession, WeeklySchedule } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isToday, setHours, setMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import PomodoroModal from './PomodoroModal';
import ConfirmDialog from '../common/ConfirmDialog';
import MoveSessionModal from './MoveSessionModal';
import CreateSessionModal from './CreateSessionModal';
import { isSessionMissed, canStartSession, getSessionTextStyle } from '../../utils/sessionHelpers';

interface WeeklyPlannerProps {
  onCreateSession?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 20 }, (_, i) => i + 5); // 5:00 to 24:00
const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ onCreateSession }) => {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedSession, setDraggedSession] = useState<StudySession | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOverTarget, setDragOverTarget] = useState<{ day: number; hour: number; minute: number } | null>(null);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [resizingSession, setResizingSession] = useState<{ session: StudySession; startY: number; startHeight: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ session: StudySession; x: number; y: number } | null>(null);
  const [moveModalSession, setMoveModalSession] = useState<StudySession | null>(null);
  const [dragOverArrow, setDragOverArrow] = useState<'prev' | 'next' | null>(null);
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
    onConfirm: () => {},
  });

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Drag over arrow to change week
  useEffect(() => {
    if (!dragOverArrow || !draggedSession) return;

    const timer = setTimeout(() => {
      if (dragOverArrow === 'prev') {
        setCurrentWeek(prev => subWeeks(prev, 1));
        toast('Önceki haftaya geçildi', { icon: '⬅️', duration: 1000 });
      } else if (dragOverArrow === 'next') {
        setCurrentWeek(prev => addWeeks(prev, 1));
        toast('Sonraki haftaya geçildi', { icon: '➡️', duration: 1000 });
      }
      setDragOverArrow(null);
    }, 800); // 800ms hover to trigger

    return () => clearTimeout(timer);
  }, [dragOverArrow, draggedSession]);

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

  // Kaçırılan görevler için uyarı - Sadece bugünün planları için göster
  // (Haftalık planlayıcı ayrı uyarı göstermesin)

  // Vakti geçmiş in_progress oturumları kontrol et ve otomatik yenile
  useEffect(() => {
    const checkOverdueSessions = () => {
      if (!sessionsData || sessionsData.length === 0) return;

      const now = new Date();
      const overdueSessions = sessionsData.filter(
        (session) =>
          session.status === 'in_progress' &&
          parseISO(session.endTime) < now
      );

      if (overdueSessions.length > 0) {
        console.log('⏰ Vakti geçmiş oturumlar bulundu, yenileniyor...', overdueSessions.length);
        refetch(); // Backend otomatik cancel edecek
      }
    };

    // İlk kontrolü yap
    checkOverdueSessions();

    // Her 30 saniyede bir kontrol et
    const interval = setInterval(checkOverdueSessions, 30000);

    return () => clearInterval(interval);
  }, [sessionsData, refetch]);

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
    // Prevent dragging if session is in progress
    if (session.status === 'in_progress') {
      e.preventDefault();
      toast.error('Devam eden oturumlar taşınamaz');
      return;
    }

    // Calculate mouse offset within the session box
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    setDraggedSession(session);
    setDragOffset(offsetY);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Get the time slot container element (not nested children)
    const timeSlot = (e.currentTarget as HTMLElement);
    const rect = timeSlot.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const slotHeight = rect.height; // Use actual height

    // Subtract the drag offset to get the actual session start position
    const sessionStartY = mouseY - dragOffset;

    // Calculate minutes with better tolerance
    const minutesFromTop = (sessionStartY / slotHeight) * 60;
    const snappedMinutes = Math.round(minutesFromTop / 15) * 15; // Snap to 0, 15, 30, or 45

    setDragOverTarget({ day: dayIndex, hour, minute: snappedMinutes });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();

    if (!draggedSession || isMoving) return;

    // Use the last known drag position for better accuracy
    const snappedMinutes = dragOverTarget?.minute ?? 0;

    setDragOverTarget(null);

    try {
      // Prevent concurrent operations
      setIsMoving(true);

      const targetDate = addDays(currentWeek, dayIndex);
      const newStartTime = new Date(targetDate);
      newStartTime.setHours(hour, snappedMinutes, 0, 0);

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
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
        await refetch();
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
    } finally {
      setIsMoving(false);
      setDraggedSession(null);
    }
  };

  const handleTimeSlotClick = (dayIndex: number, hour: number) => {
    if (onCreateSession) {
      const targetDate = addDays(currentWeek, dayIndex);
      const sessionDate = new Date(targetDate);
      sessionDate.setHours(hour, 0, 0, 0);
      onCreateSession(sessionDate, hour);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, session: StudySession) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      session,
      x: e.clientX,
      y: e.clientY,
    });
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

      // Keep the same time as original session
      const sessionStart = parseISO(moveModalSession.startTime);
      const newStartTime = setHours(setMinutes(targetDate, sessionStart.getMinutes()), sessionStart.getHours());

      const sessionDuration = moveModalSession.duration;
      const newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + sessionDuration);

      const response = await studySessionsAPI.updateSession(moveModalSession.id.toString(), {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });

      if (response.data.success) {
        toast.success('Oturum başarıyla taşındı', { id: 'moving-session' });
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
        await refetch();
        setMoveModalSession(null);
      }
    } catch (error: any) {
      console.error('Error moving session:', error);
      toast.error(error.response?.data?.error?.message || 'Oturum taşınırken hata oluştu', {
        id: 'moving-session',
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleSessionClick = async (e: React.MouseEvent, session: StudySession) => {
    e.stopPropagation();

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = (now.getDay() + 6) % 7; // Convert to Monday=0

    const sessionStartTime = parseISO(session.startTime);
    const sessionHour = sessionStartTime.getHours();
    const sessionDay = (sessionStartTime.getDay() + 6) % 7;

    // Check if session is in current time slot
    const isCurrentTimeSlot = sessionDay === currentDay && sessionHour === currentHour;

    if (session.status === 'in_progress') {
      // If session is in progress, show option to complete it
      setConfirmDialog({
        isOpen: true,
        title: 'Oturumu Sonlandır',
        message: 'Bu oturumu sonlandırmak istiyor musunuz?',
        type: 'warning',
        onConfirm: async () => {
          try {
            await studySessionsAPI.completeSession(session.id.toString());
            toast.success('Çalışma seansı tamamlandı');
            triggerConfetti();
            queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
            refetch();
          } catch (error) {
            toast.error('Seans tamamlanırken hata oluştu');
          }
        },
      });
      return;
    }

    if (session.status === 'completed') {
      // Allow restarting completed sessions
      setConfirmDialog({
        isOpen: true,
        title: 'Oturumu Tekrar Başlat',
        message: 'Bu tamamlanmış oturumu tekrar planlanmış duruma getirmek istiyor musunuz?',
        type: 'info',
        onConfirm: async () => {
          try {
            await studySessionsAPI.updateSession(session.id.toString(), {
              status: 'planned',
            });
            toast.success('Oturum tekrar planlanmış duruma getirildi');
            queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
            refetch();
          } catch (error) {
            toast.error('Oturum güncellenirken hata oluştu');
          }
        },
      });
      return;
    }

    // Vakti geçmiş oturumlar başlatılamaz
    if (!canStartSession(session)) {
      toast.error('Bu oturum için zaman geçmiş. Lütfen oturum saatini güncelleyin.');
      return;
    }

    // Check if trying to start a session not in current time slot
    if (!isCurrentTimeSlot) {
      toast.error('Oturum sadece şu anki saat diliminde başlatılabilir');
      return;
    }

    if (session.sessionType === 'pomodoro') {
      setActiveSession(session);
      setIsPomodoroModalOpen(true);
    } else {
      // Start session without changing its time
      try {
        await studySessionsAPI.startSession(session.id.toString());
        toast.success('Çalışma seansı başlatıldı');
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
        refetch();
      } catch (error) {
        toast.error('Seans başlatılırken hata oluştu');
      }
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#10b981', '#4ade80', '#86efac'],
    });
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
          triggerConfetti();
          queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
          queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
          refetch();
        } catch (error) {
          toast.error('Seans tamamlanırken hata oluştu');
        }
      },
    });
  };

  const handleResizeStart = (e: React.MouseEvent, session: StudySession, currentHeight: number) => {
    e.stopPropagation();
    setResizingSession({
      session,
      startY: e.clientY,
      startHeight: currentHeight,
    });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingSession) return;
    // Visual feedback only during drag - actual update happens on mouseup
  };

  const handleResizeEnd = async (e: MouseEvent) => {
    if (!resizingSession) return;

    const deltaY = e.clientY - resizingSession.startY;
    const newHeight = Math.max(15, resizingSession.startHeight + deltaY); // Minimum 15px (15 minutes)

    // Calculate new duration based on height (60px = 60 minutes)
    const newDuration = Math.round((newHeight / 60) * 60);

    // Update session duration
    const sessionStart = parseISO(resizingSession.session.startTime);
    const newEndTime = new Date(sessionStart);
    newEndTime.setMinutes(sessionStart.getMinutes() + newDuration);

    try {
      // Update in database
      await studySessionsAPI.updateSession(resizingSession.session.id.toString(), {
        endTime: newEndTime.toISOString(),
      });
      toast.success('Süre güncellendi');
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
      await refetch();
    } catch (error) {
      toast.error('Süre güncellenirken hata oluştu');
    }

    setResizingSession(null);
  };

  useEffect(() => {
    if (resizingSession) {
      const handleMouseUp = (e: MouseEvent) => handleResizeEnd(e);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingSession]);

  const getSessionTypeColor = (sessionType: string) => {
    switch (sessionType) {
      case 'study': return 'bg-blue-500 border-blue-600';
      case 'pomodoro': return 'bg-red-500 border-red-600';
      case 'review': return 'bg-green-500 border-green-600';
      case 'break': return 'bg-gray-500 border-gray-600';
      default: return 'bg-blue-500 border-blue-600';
    }
  };

  const getStatusColor = (status: string, sessionStartTime: string, sessionEndTime: string) => {
    const now = new Date();
    const sessionEnd = parseISO(sessionEndTime);
    const isPast = sessionEnd < now;

    switch (status) {
      case 'completed': return 'opacity-60';
      case 'in_progress':
        // Vakti geçmiş ve hala devam ediyorsa
        if (isPast) return 'ring-2 ring-red-400';
        return 'ring-2 ring-yellow-400';
      case 'cancelled': return 'opacity-40 bg-gray-400';
      case 'planned':
        if (isPast) return 'opacity-70';
        return '';
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
            onDragOver={(e) => {
              if (draggedSession) {
                e.preventDefault();
                setDragOverArrow('prev');
              }
            }}
            onDragLeave={() => setDragOverArrow(null)}
            className={`p-2 transition-colors ${
              dragOverArrow === 'prev'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
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
            onDragOver={(e) => {
              if (draggedSession) {
                e.preventDefault();
                setDragOverArrow('next');
              }
            }}
            onDragLeave={() => setDragOverArrow(null)}
            className={`p-2 transition-colors ${
              dragOverArrow === 'next'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
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
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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
                <div className="relative p-3 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {hour === 24 ? '24:00' : `${hour.toString().padStart(2, '0')}:00`}
                  </div>
                </div>

                {/* Day columns */}
                {DAYS.map((_, dayIndex) => {
                  const sessions = getSessionsForTimeSlot(dayIndex, hour);
                  const isDragOver = dragOverTarget?.day === dayIndex && dragOverTarget?.hour === hour;
                  const dayDate = addDays(currentWeek, dayIndex);
                  const isCurrentDay = isToday(dayDate);

                  // Calculate current time indicator position
                  const currentHour = currentTime.getHours();
                  const currentMinutes = currentTime.getMinutes();
                  const currentDayIndex = (currentTime.getDay() + 6) % 7; // Convert to Monday=0
                  const isCurrentHour = isCurrentDay && hour === currentHour;
                  const timeIndicatorPosition = (currentMinutes / 60) * 100; // Percentage within the hour

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`relative min-h-[60px] border-r border-gray-200 dark:border-gray-700 transition-colors ${
                        isCurrentDay ? 'bg-blue-50/50 dark:bg-blue-900/10' :
                        'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIndex, hour)}
                      onClick={() => handleTimeSlotClick(dayIndex, hour)}
                    >
                      {/* 30-minute interval guide - more prominent */}
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600 opacity-60"></div>

                      {/* Drag Preview - Show where session will be dropped */}
                      {isDragOver && draggedSession && dragOverTarget && (
                        <div
                          className="absolute inset-x-1 p-1 rounded-lg border-2 border-dashed border-blue-500 z-40 pointer-events-none"
                          style={{
                            top: `${(dragOverTarget.minute / 60) * 60}px`,
                            height: `${(draggedSession.duration / 60) * 60}px`,
                          }}
                        >
                          <div className="flex items-center justify-between h-full opacity-50">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-blue-700 dark:text-blue-300">{draggedSession.title}</div>
                              {draggedSession.duration && (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400">{draggedSession.duration} dk</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current time indicator */}
                      {isCurrentHour && (
                        <div
                          className="absolute left-0 right-0 z-50 pointer-events-none"
                          style={{ top: `${timeIndicatorPosition}%` }}
                        >
                          <div className="relative">
                            <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="h-0.5 bg-red-500"></div>
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {sessions.map((session, sessionIndex) => {
                          // Calculate session start time within the hour (in minutes)
                          const sessionStart = parseISO(session.startTime);
                          const sessionMinutes = sessionStart.getMinutes();

                          // Slot height is 60px per hour (min-h-[60px])
                          const slotHeight = 60;
                          // Calculate position and height in pixels
                          const topPosition = (sessionMinutes / 60) * slotHeight;
                          // Allow sessions to span multiple hours
                          const sessionHeight = (session.duration / 60) * slotHeight;

                          // Determine text size based on height
                          const textSizeClass = sessionHeight < 30 ? 'text-[10px]' : 'text-xs';

                          const isBeingDragged = draggedSession?.id === session.id;

                          return (
                            <motion.div
                              key={session.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{
                                opacity: isBeingDragged ? 0.3 : 1,
                                y: 0,
                                scale: isBeingDragged ? 0.95 : 1,
                              }}
                              exit={{ opacity: 0, y: -10 }}
                              className={`absolute inset-x-1 p-1 rounded-lg border-2 text-white ${getStatusColor(session.status, session.startTime, session.endTime)} group ${textSizeClass} ${isBeingDragged ? 'ring-2 ring-blue-400' : ''}`}
                              style={{
                                top: `${topPosition}px`,
                                height: `${sessionHeight}px`,
                                zIndex: isBeingDragged ? 50 : 10,
                                backgroundColor: session.color || '#3B82F6',
                                borderColor: session.color || '#3B82F6',
                                cursor: session.status === 'in_progress' ? 'default' : 'move',
                              }}
                            draggable={session.status !== 'in_progress'}
                            onDragStart={(e) => handleDragStart(e as any, session)}
                            onClick={session.status !== 'in_progress' ? (e) => handleSessionClick(e, session) : undefined}
                            onContextMenu={(e) => handleContextMenu(e, session)}
                          >
                            {/* Time badge - start and end time */}
                            {sessionHeight >= 35 && (
                              <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-black/20 rounded text-[9px] font-medium">
                                {format(sessionStart, 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                              </div>
                            )}

                            <div className="flex items-center justify-between h-full">
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium truncate ${getSessionTextStyle(session)}`}>{session.title}</div>
                                {session.duration && sessionHeight >= 25 && (
                                  <div className="opacity-75 text-[10px]">{session.duration} dk</div>
                                )}
                              </div>
                              {session.sessionType === 'pomodoro' && session.status === 'planned' && canStartSession(session) && (
                                <Timer className="w-3 h-3 ml-1 opacity-75 group-hover:opacity-100 cursor-pointer" />
                              )}
                              {session.status === 'planned' && session.sessionType !== 'pomodoro' && canStartSession(session) && (
                                <Play className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 cursor-pointer" />
                              )}
                              {session.status === 'in_progress' && (
                                <>
                                  <Pause
                                    className="w-3 h-3 ml-1 opacity-75 group-hover:opacity-100 cursor-pointer text-orange-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePauseSession(session);
                                    }}
                                  />
                                  <CheckCircle
                                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 cursor-pointer text-green-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteSession(session);
                                    }}
                                  />
                                </>
                              )}
                              {session.status === 'paused' && (
                                <Play
                                  className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 cursor-pointer text-blue-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartSession(session);
                                  }}
                                />
                              )}
                              {session.status === 'completed' && (
                                <div className="flex flex-col gap-1 ml-1">
                                  <RotateCcw className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer" />
                                  <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer" onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSession(session);
                                  }} />
                                </div>
                              )}
                            </div>

                            {/* Resize handle - bottom border */}
                            {session.status !== 'in_progress' && session.status !== 'completed' && (
                              <div
                                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-white/30 transition-colors"
                                onMouseDown={(e) => handleResizeStart(e, session, sessionHeight)}
                              />
                            )}
                          </motion.div>
                          );
                        })}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleEditSession(contextMenu.session);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          >
            <Edit className="w-4 h-4" />
            Düzenle
          </button>
          <button
            onClick={() => {
              setMoveModalSession(contextMenu.session);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
          >
            <MoveRight className="w-4 h-4" />
            Taşı
          </button>
        </div>
      )}

      {/* Move Session Modal */}
      <MoveSessionModal
        isOpen={!!moveModalSession}
        onClose={() => setMoveModalSession(null)}
        onSelectDate={handleMoveToDate}
        sessionTitle={moveModalSession?.title || ''}
        currentDate={moveModalSession ? parseISO(moveModalSession.startTime) : new Date()}
      />

      {/* Edit Session Modal */}
      <CreateSessionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSession(null);
          refetch();
        }}
        editSession={editingSession}
      />
    </div>
  );
};

export default WeeklyPlanner;