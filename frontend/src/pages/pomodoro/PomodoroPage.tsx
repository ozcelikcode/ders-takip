import { useCurrentDateKey } from '../../hooks/useCurrentDateKey';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import PageHeader from '../../components/common/PageHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
Award,
Calendar,
CheckCircle,
Clock,
Coffee,
Pause,
Play,
RotateCcw,
Target,
Timer,
TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { studySessionsAPI } from '../../services/api';
import { StudySession } from '../../types/planner';

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

const PomodoroPage = () => {
  const accountKeys = useAccountQueryKeys();
  const today = useCurrentDateKey();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch today's pomodoro sessions
  const { data: sessions } = useQuery({
    queryKey: accountKeys.sessions('pomodoro-sessions', today),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        startDate: today,
        endDate: today,
      });
      // Filter only pomodoro sessions
      const allSessions = response.data.data?.sessions || [];
      return allSessions.filter(s => s.sessionType === 'pomodoro');
    },
    refetchInterval: 5000,
  });

  // Auto-select first in-progress session, or first planned session
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      const inProgressSession = sessions.find(s => s.status === 'in_progress');
      const pausedSession = sessions.find(s => s.status === 'paused');
      const plannedSession = sessions.find(s => s.status === 'planned');

      if (!selectedSession) {
        setSelectedSession(inProgressSession || pausedSession || plannedSession || sessions[0]);
      }
    }
  }, [sessions]);

  // Initialize timer when session is selected
  useEffect(() => {
    if (selectedSession?.pomodoroSettings) {
      const workDuration = selectedSession.pomodoroSettings.workDuration || 25;
      setTimeLeft(workDuration * 60);
      setCurrentCycle(selectedSession.pomodoroSettings.currentCycle || 1);
      setCurrentPhase('work');
      setIsRunning(selectedSession.status === 'in_progress');
    }
  }, [selectedSession?.id]);

  // Timer logic
  useEffect(() => {
    let interval: any;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handlePhaseComplete = () => {
    setIsRunning(false);

    if (!selectedSession?.pomodoroSettings) return;

    const settings = selectedSession.pomodoroSettings;

    if (currentPhase === 'work') {
      // Work phase completed
      if (currentCycle >= (settings.cyclesBeforeLongBreak || 4)) {
        // Long break
        setCurrentPhase('longBreak');
        setTimeLeft((settings.longBreak || 15) * 60);
        toast.success('🎉 Harika! Uzun molaya hak kazandın!');
      } else {
        // Short break
        setCurrentPhase('shortBreak');
        setTimeLeft((settings.shortBreak || 5) * 60);
        toast.success('✨ Çalışma tamamlandı! Kısa mola zamanı.');
      }
    } else {
      // Break completed, start new work cycle
      if (currentPhase === 'longBreak') {
        setCurrentCycle(1);
      } else {
        setCurrentCycle((prev) => prev + 1);
      }
      setCurrentPhase('work');
      setTimeLeft((settings.workDuration || 25) * 60);
      toast.success('🔥 Mola bitti! Yeni çalışma döngüsü başlıyor.');
    }
  };

  const handleStart = async (session: StudySession) => {
    if (session.status === 'planned') {
      try {
        await studySessionsAPI.startSession(session.id.toString());
        toast.success('Pomodoro seansı başlatıldı!');
        setSelectedSession(session);
        setIsRunning(true);
        queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
      } catch {
        toast.error('Seans başlatılırken hata oluştu');
      }
    } else if (session.status === 'paused') {
      try {
        await studySessionsAPI.startSession(session.id.toString());
        toast.success('Pomodoro seansı devam ediyor!');
        setIsRunning(true);
        queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
      } catch {
        toast.error('Seans başlatılırken hata oluştu');
      }
    } else if (session.status === 'in_progress') {
      setIsRunning(true);
    }
  };

  const handlePause = async (session: StudySession) => {
    try {
      await studySessionsAPI.pauseSession(session.id.toString());
      toast.success('Pomodoro seansı duraklatıldı');
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
    } catch {
      toast.error('Seans duraklatılırken hata oluştu');
    }
  };

  const handleComplete = async (session: StudySession) => {
    try {
      await studySessionsAPI.completeSession(session.id.toString());
      toast.success('Pomodoro seansı tamamlandı');
      setIsRunning(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
    } catch {
      toast.error('Seans tamamlanırken hata oluştu');
    }
  };

  const handleRestart = async (session: StudySession) => {
    try {
      await studySessionsAPI.updateSession(session.id.toString(), {
        status: 'planned',
      });
      toast.success('Pomodoro seansı yeniden başlatıldı');
      queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
    } catch {
      toast.error('Seans yeniden başlatılırken hata oluştu');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!selectedSession?.pomodoroSettings) return 0;

    const settings = selectedSession.pomodoroSettings;
    let totalDuration: number;

    if (currentPhase === 'work') {
      totalDuration = (settings.workDuration || 25) * 60;
    } else if (currentPhase === 'shortBreak') {
      totalDuration = (settings.shortBreak || 5) * 60;
    } else {
      totalDuration = (settings.longBreak || 15) * 60;
    }

    return Math.max(0, Math.min(100, ((totalDuration - timeLeft) / totalDuration) * 100));
  };



  const getPhaseText = () => {
    switch (currentPhase) {
      case 'work':
        return 'Çalışma zamanı';
      case 'shortBreak':
        return 'Kısa mola';
      case 'longBreak':
        return 'Uzun mola';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full">Planlandı</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Devam Ediyor</span>;
      case 'paused':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">Duraklatıldı</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 rounded-full">Tamamlandı</span>;
      default:
        return null;
    }
  };

  const completedCount = sessions?.filter(s => s.status === 'completed').length || 0;
  const inProgressCount = sessions?.filter(s => s.status === 'in_progress').length || 0;
  const plannedCount = sessions?.filter(s => s.status === 'planned').length || 0;

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col gap-6">
      <PageHeader title="Pomodoro" description="Bir seans seç. Tek bir işe odaklan, molalarla ritmini koru." />

      {/* Stats - Fixed height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--subtle)] rounded-md">
              <Calendar className="w-4 h-4 text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Planlanan</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{plannedCount}</p>
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--subtle)] rounded-md">
              <TrendingUp className="w-4 h-4 text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Devam Eden</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--subtle)] rounded-md">
              <Award className="w-4 h-4 text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Tamamlanan</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {sessions && sessions.length === 0 ? (
        <div className="min-h-[320px] flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Timer className="w-20 h-20 text-gray-200 dark:text-gray-700 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Bugün için Pomodoro seansı yok
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Planlayıcıdan Pomodoro türünde bir seans oluşturun
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List - Scrollable */}
          <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden panel">
            <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                Bugünkü Seanslar
              </h2>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Liste</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              <AnimatePresence>
                {sessions?.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    className={`p-3 rounded-md border transition-colors ${selectedSession?.id === session.id
                      ? 'border-gray-400 bg-[var(--subtle)] dark:border-gray-500'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          <button onClick={() => setSelectedSession(session)} aria-pressed={selectedSession?.id === session.id} className="rounded text-left hover:underline">{session.title}</button>
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>

                    {session.pomodoroSettings && (
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                        <div className="flex items-center gap-1 text-[var(--muted)]">
                          <Timer className="w-3 h-3" />
                          {session.pomodoroSettings.workDuration}dk
                        </div>
                        <div className="flex items-center gap-1 text-[var(--muted)]">
                          <Coffee className="w-3 h-3" />
                          {session.pomodoroSettings.shortBreak}dk
                        </div>
                        <div className="flex items-center gap-1 text-[var(--muted)]">
                          <Target className="w-3 h-3" />
                          {session.pomodoroSettings.cyclesBeforeLongBreak} döngü
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {session.status === 'planned' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStart(session);
                          }}
                          className="btn btn-secondary flex-1 text-xs"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Başlat
                        </button>
                      )}

                      {session.status === 'in_progress' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePause(session);
                            }}
                            className="btn btn-secondary flex-1 text-xs"
                          >
                            <Pause className="w-3 h-3 fill-current" />
                            Durdur
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(session);
                            }}
                            className="btn btn-secondary flex-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Bitir
                          </button>
                        </>
                      )}

                      {session.status === 'paused' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(session);
                            }}
                            className="btn btn-secondary flex-1 text-xs"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Devam
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(session);
                            }}
                            className="btn btn-secondary flex-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Bitir
                          </button>
                        </>
                      )}

                      {session.status === 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestart(session);
                          }}
                          className="btn btn-secondary flex-1 text-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Yeniden
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Timer Display - Flexible */}
          <div className="lg:col-span-2 flex flex-col min-h-0 panel overflow-hidden">
            {selectedSession ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {/* Session Title */}
                <div className="text-center mb-6 flex-shrink-0">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-1">
                    {selectedSession.title}
                  </h2>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {getPhaseText()}
                  </div>
                </div>

                {/* Focus display */}
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="text-[64px] font-medium leading-none tracking-[-0.07em] tabular-nums sm:text-[80px]">{formatTime(timeLeft)}</div>
                  <p className="mt-4 text-xs text-[var(--muted)]">{currentCycle}. döngü / {selectedSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}</p>
                  <div className="mt-7 h-1 w-full max-w-[240px] overflow-hidden rounded-full bg-[var(--subtle)]" role="progressbar" aria-label="Seans ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(getProgress())}>
                    <div className="h-full bg-[var(--solid)] transition-[width]" style={{ width: `${getProgress()}%` }} />
                  </div>

                  {/* Controls */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {selectedSession.status === 'in_progress' && (
                      <button
                        onClick={() => setIsRunning(!isRunning)}
                        className="btn btn-primary"
                      >
                        {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isRunning ? 'Duraklat' : 'Devam et'}
                      </button>
                    )}

                    {(selectedSession.status === 'planned' || selectedSession.status === 'paused') && (
                      <button
                        onClick={() => handleStart(selectedSession)}
                        className="btn btn-primary"
                      >
                        <Play className="h-4 w-4" />Başlat
                      </button>
                    )}

                    {selectedSession.status !== 'completed' && (
                      <button
                        onClick={() => handleComplete(selectedSession)}
                        className="btn btn-secondary"
                        title="Tamamla"
                      >
                        <CheckCircle className="h-4 w-4" />Tamamla
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Settings Info - Bottom */}
                <div className="grid grid-cols-3 gap-3 mt-auto pt-6 flex-shrink-0">
                  <div className="bg-[var(--subtle)] rounded-md p-3 text-center">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Çalışma</p>
                    <p className="text-xl font-medium text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.workDuration || 25}<span className="text-xs ml-0.5">dk</span>
                    </p>
                  </div>

                  <div className="bg-[var(--subtle)] rounded-md p-3 text-center">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Mola</p>
                    <p className="text-xl font-medium text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.shortBreak || 5}<span className="text-xs ml-0.5">dk</span>
                    </p>
                  </div>

                  <div className="bg-[var(--subtle)] rounded-md p-3 text-center">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Döngü</p>
                    <p className="text-xl font-medium text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}<span className="text-xs ml-0.5">sefer</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <Timer className="w-24 h-24 text-gray-100 dark:text-gray-700 mb-6" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Bir seans seçin
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sol taraftaki listeden bir Pomodoro seansı seçerek başlatın
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroPage;
