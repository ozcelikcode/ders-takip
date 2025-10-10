import React, { useState, useEffect } from 'react';
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
import { format, parseISO, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
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
  const { data: sessions, refetch } = useQuery({
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
    let interval: NodeJS.Timeout;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Timer className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pomodoro Çalışma Seansları
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Bugünkü pomodoro planlarınız ve zamanlayıcınız
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Planlanan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{plannedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Devam Eden</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inProgressCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tamamlanan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {sessions && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Timer className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bugün için Pomodoro seansı yok
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Planlayıcıdan Pomodoro türünde bir seans oluşturun
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sessions List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Bugünkü Seanslar
              </h2>

              <div className="space-y-3">
                <AnimatePresence>
                  {sessions?.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      onClick={() => setSelectedSession(session)}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedSession?.id === session.id
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                            {session.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(session.startTime), 'HH:mm', { locale: tr })} -
                            {format(parseISO(session.endTime), 'HH:mm', { locale: tr })}
                          </div>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>

                      {session.pomodoroSettings && (
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {session.pomodoroSettings.workDuration}dk
                          </div>
                          <div className="flex items-center gap-1">
                            <Coffee className="w-3 h-3" />
                            {session.pomodoroSettings.shortBreak}dk
                          </div>
                          <div className="flex items-center gap-1">
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
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Play className="w-4 h-4" />
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
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <Pause className="w-4 h-4" />
                              Duraklat
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(session);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Tamamla
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
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <Play className="w-4 h-4" />
                              Devam Et
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(session);
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Tamamla
                            </button>
                          </>
                        )}

                        {session.status === 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestart(session);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Yeniden Başlat
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Timer Display */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                  {/* Session Title */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedSession.title}
                    </h2>
                    {selectedSession.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {selectedSession.description}
                      </p>
                    )}
                  </div>

                  {/* Phase Indicator */}
                  <div className="text-center mb-8">
                    <h3 className={`text-xl font-bold mb-2 ${getPhaseTextColor()}`}>
                      {getPhaseText()}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Döngü {currentCycle} / {selectedSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}
                    </p>
                  </div>

                  {/* Circular Progress */}
                  <div className="relative w-72 h-72 mx-auto mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="144"
                        cy="144"
                        r="128"
                        stroke="currentColor"
                        strokeWidth="20"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="144"
                        cy="144"
                        r="128"
                        stroke="url(#gradient)"
                        strokeWidth="20"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 128}`}
                        strokeDashoffset={`${2 * Math.PI * 128 * (1 - getProgress() / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" className={`${currentPhase === 'work' ? 'text-red-500' : currentPhase === 'shortBreak' ? 'text-green-500' : 'text-blue-500'}`} stopColor="currentColor" />
                          <stop offset="100%" className={`${currentPhase === 'work' ? 'text-orange-500' : currentPhase === 'shortBreak' ? 'text-emerald-500' : 'text-indigo-500'}`} stopColor="currentColor" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Timer Display */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <motion.div
                          key={timeLeft}
                          initial={{ scale: 0.95 }}
                          animate={{ scale: 1 }}
                          className="text-6xl font-bold text-gray-900 dark:text-white mb-2 font-mono"
                        >
                          {formatTime(timeLeft)}
                        </motion.div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {Math.floor(getProgress())}% tamamlandı
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4 mb-8">
                    {selectedSession.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => setIsRunning(!isRunning)}
                          className={`p-5 rounded-full transition-all transform hover:scale-110 shadow-lg ${
                            isRunning
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                        </button>

                        <button
                          onClick={() => handleComplete(selectedSession)}
                          className="p-5 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all transform hover:scale-110 shadow-lg"
                          title="Tamamla"
                        >
                          <CheckCircle className="w-8 h-8" />
                        </button>
                      </>
                    )}

                    {(selectedSession.status === 'planned' || selectedSession.status === 'paused') && (
                      <button
                        onClick={() => handleStart(selectedSession)}
                        className="p-5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all transform hover:scale-110 shadow-lg"
                      >
                        <Play className="w-8 h-8" />
                      </button>
                    )}
                  </div>

                  {/* Session Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-2">
                        <Timer className="w-5 h-5" />
                        <span className="font-semibold text-sm">Çalışma</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedSession.pomodoroSettings?.workDuration || 25} dk
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-2">
                        <Coffee className="w-5 h-5" />
                        <span className="font-semibold text-sm">Kısa Mola</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedSession.pomodoroSettings?.shortBreak || 5} dk
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="font-semibold text-sm">Uzun Mola</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedSession.pomodoroSettings?.longBreak || 15} dk
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center min-h-[600px]">
                  <Timer className="w-32 h-32 text-gray-400 dark:text-gray-600 mb-6" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Bir seans seçin
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    Sol taraftaki listeden bir Pomodoro seansı seçin
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroPage;
