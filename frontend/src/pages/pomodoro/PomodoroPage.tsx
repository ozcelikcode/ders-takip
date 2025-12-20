import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { StudySession } from '../../types/planner';
import {
  Play,
  Pause,
  CheckCircle,
  Timer,
  Coffee,
  Clock,
  Target,
  RotateCcw,
  Calendar,
  TrendingUp,
  Award
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

const PomodoroPage = () => {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch today's pomodoro sessions
  const { data: sessions } = useQuery({
    queryKey: ['pomodoro-sessions'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
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
        queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      } catch (error) {
        toast.error('Seans başlatılırken hata oluştu');
      }
    } else if (session.status === 'paused') {
      try {
        await studySessionsAPI.startSession(session.id.toString());
        toast.success('Pomodoro seansı devam ediyor!');
        setIsRunning(true);
        queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      } catch (error) {
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
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
    } catch (error) {
      toast.error('Seans duraklatılırken hata oluştu');
    }
  };

  const handleComplete = async (session: StudySession) => {
    try {
      await studySessionsAPI.completeSession(session.id.toString());
      toast.success('🎊 Pomodoro seansı tamamlandı!');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f97316', '#f59e0b'],
      });
      setIsRunning(false);
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
    } catch (error) {
      toast.error('Seans tamamlanırken hata oluştu');
    }
  };

  const handleRestart = async (session: StudySession) => {
    try {
      await studySessionsAPI.updateSession(session.id.toString(), {
        status: 'planned',
      });
      toast.success('Pomodoro seansı yeniden başlatıldı');
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
    } catch (error) {
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
    let totalDuration = 0;

    if (currentPhase === 'work') {
      totalDuration = (settings.workDuration || 25) * 60;
    } else if (currentPhase === 'shortBreak') {
      totalDuration = (settings.shortBreak || 5) * 60;
    } else {
      totalDuration = (settings.longBreak || 15) * 60;
    }

    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'work':
        return 'from-red-500 to-orange-500';
      case 'shortBreak':
        return 'from-green-500 to-emerald-500';
      case 'longBreak':
        return 'from-blue-500 to-indigo-500';
    }
  };

  const getPhaseTextColor = () => {
    switch (currentPhase) {
      case 'work':
        return 'text-red-600 dark:text-red-400';
      case 'shortBreak':
        return 'text-green-600 dark:text-green-400';
      case 'longBreak':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'work':
        return '🍅 Çalışma Zamanı';
      case 'shortBreak':
        return '☕ Kısa Mola';
      case 'longBreak':
        return '🌟 Uzun Mola';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">Planlandı</span>;
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
    <div className="h-[calc(100vh-130px)] flex flex-col gap-6 overflow-hidden pr-1">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Timer className="w-7 h-7 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pomodoro Çalışma Seansları
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Bugünkü pomodoro planlarınız ve zamanlayıcınız
        </p>
      </div>

      {/* Stats - Fixed height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Planlanan</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{plannedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Devam Eden</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Tamamlanan</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {sessions && sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Timer className="w-20 h-20 text-gray-200 dark:text-gray-700 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Bugün için Pomodoro seansı yok
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Planlayıcıdan Pomodoro türünde bir seans oluşturun
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List - Scrollable */}
          <div className="lg:col-span-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
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
                    onClick={() => setSelectedSession(session)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${selectedSession?.id === session.id
                      ? 'border-primary-500 bg-primary-50/10 dark:bg-primary-900/10'
                      : 'border-transparent bg-gray-50 dark:bg-gray-700/30'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {session.title}
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
                        <div className="flex items-center gap-1 text-red-500/80">
                          <Timer className="w-3 h-3" />
                          {session.pomodoroSettings.workDuration}dk
                        </div>
                        <div className="flex items-center gap-1 text-green-500/80">
                          <Coffee className="w-3 h-3" />
                          {session.pomodoroSettings.shortBreak}dk
                        </div>
                        <div className="flex items-center gap-1 text-blue-500/80">
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
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs font-bold"
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
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors text-xs font-bold"
                          >
                            <Pause className="w-3 h-3 fill-current" />
                            Durdur
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(session);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-xs font-bold"
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
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs font-bold"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Devam
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(session);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-xs font-bold"
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
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs font-bold"
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
          <div className="lg:col-span-2 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {selectedSession ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {/* Session Title */}
                <div className="text-center mb-6 flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedSession.title}
                  </h2>
                  <div className={`text-sm font-bold uppercase tracking-widest ${getPhaseTextColor()}`}>
                    {getPhaseText()}
                  </div>
                </div>

                {/* Circular Progress Area */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="relative w-64 h-64 md:w-72 md:h-72">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="50%"
                        cy="50%"
                        r="43%"
                        stroke="currentColor"
                        strokeWidth="16"
                        fill="none"
                        className="text-gray-100 dark:text-gray-700/50"
                      />
                      <circle
                        cx="50%"
                        cy="50%"
                        r="43%"
                        stroke="url(#timerGradient)"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray="100 100"
                        strokeDashoffset={100 - getProgress()}
                        pathLength="100"
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" className={`${currentPhase === 'work' ? 'text-red-500' : currentPhase === 'shortBreak' ? 'text-green-500' : 'text-blue-500'}`} stopColor="currentColor" />
                          <stop offset="100%" className={`${currentPhase === 'work' ? 'text-orange-500' : currentPhase === 'shortBreak' ? 'text-emerald-500' : 'text-indigo-500'}`} stopColor="currentColor" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Timer Time Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">
                        {formatTime(timeLeft)}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400 mt-2 tracking-widest">
                        {currentCycle}. Döngü / {selectedSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-6 mt-10">
                    {selectedSession.status === 'in_progress' && (
                      <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-5 rounded-full shadow-lg transition-all active:scale-95 ${isRunning
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                      >
                        {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                      </button>
                    )}

                    {(selectedSession.status === 'planned' || selectedSession.status === 'paused') && (
                      <button
                        onClick={() => handleStart(selectedSession)}
                        className="p-5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all active:scale-95"
                      >
                        <Play className="w-8 h-8 fill-current" />
                      </button>
                    )}

                    {selectedSession.status !== 'completed' && (
                      <button
                        onClick={() => handleComplete(selectedSession)}
                        className="p-5 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg transition-all active:scale-95"
                        title="Tamamla"
                      >
                        <CheckCircle className="w-8 h-8" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Settings Info - Bottom */}
                <div className="grid grid-cols-3 gap-3 mt-auto pt-6 flex-shrink-0">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest mb-1">Çalışma</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.workDuration || 25}<span className="text-xs ml-0.5">dk</span>
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-green-500 dark:text-green-400 uppercase tracking-widest mb-1">Mola</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.shortBreak || 5}<span className="text-xs ml-0.5">dk</span>
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">Döngü</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}<span className="text-xs ml-0.5">sefer</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <Timer className="w-24 h-24 text-gray-100 dark:text-gray-700 mb-6" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
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
