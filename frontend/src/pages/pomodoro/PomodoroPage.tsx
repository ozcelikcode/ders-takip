import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { StudySession } from '../../types/planner';
import { Play, Pause, SkipForward, CheckCircle, Timer, Coffee, Clock } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

const PomodoroPage = () => {
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch active pomodoro sessions
  const { data: sessions, refetch } = useQuery({
    queryKey: ['pomodoro-sessions'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        sessionType: 'pomodoro',
        status: 'in_progress',
      });
      return response.data.data?.sessions || [];
    },
    refetchInterval: 5000,
  });

  // Auto-select first active session
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSession) {
      setActiveSession(sessions[0]);
    }
  }, [sessions, activeSession]);

  // Initialize timer when session is selected
  useEffect(() => {
    if (activeSession?.pomodoroSettings) {
      const workDuration = activeSession.pomodoroSettings.workDuration || 25;
      setTimeLeft(workDuration * 60);
      setCurrentCycle(activeSession.pomodoroSettings.currentCycle || 1);
    }
  }, [activeSession]);

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

    if (!activeSession?.pomodoroSettings) return;

    const settings = activeSession.pomodoroSettings;

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

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleSkip = () => {
    setTimeLeft(0);
    handlePhaseComplete();
  };

  const handleComplete = async () => {
    if (!activeSession) return;

    try {
      await studySessionsAPI.completeSession(activeSession.id.toString());
      toast.success('🎊 Pomodoro seansı tamamlandı!');
      setActiveSession(null);
      setIsRunning(false);
      refetch();
    } catch (error) {
      toast.error('Seans tamamlanırken hata oluştu');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!activeSession?.pomodoroSettings) return 0;

    const settings = activeSession.pomodoroSettings;
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

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Timer className="w-24 h-24 text-gray-400 dark:text-gray-600" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Aktif Pomodoro Seansı Yok
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Planlayıcıdan bir Pomodoro seansı başlatın
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pomodoro Timer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {activeSession.title}
        </p>
      </div>

      {/* Main Timer Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
        {/* Phase Indicator */}
        <div className="text-center mb-8">
          <h2 className={`text-2xl font-bold mb-2 ${getPhaseColor()}`}>
            {getPhaseText()}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Döngü {currentCycle} / {activeSession.pomodoroSettings?.cyclesBeforeLongBreak || 4}
          </p>
        </div>

        {/* Circular Progress */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="16"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="16"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 112}`}
              strokeDashoffset={`${2 * Math.PI * 112 * (1 - getProgress() / 100)}`}
              className={currentPhase === 'work' ? 'text-red-500' : currentPhase === 'shortBreak' ? 'text-green-500' : 'text-blue-500'}
              strokeLinecap="round"
            />
          </svg>

          {/* Timer Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {Math.floor(getProgress())}% tamamlandı
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePlayPause}
            className={`p-4 rounded-full transition-all transform hover:scale-110 ${
              isRunning
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </button>

          <button
            onClick={handleSkip}
            className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all transform hover:scale-110"
            title="Geç"
          >
            <SkipForward className="w-8 h-8" />
          </button>

          <button
            onClick={handleComplete}
            className="p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all transform hover:scale-110"
            title="Tamamla"
          >
            <CheckCircle className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
            <Timer className="w-5 h-5" />
            <span className="font-semibold">Çalışma</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeSession.pomodoroSettings?.workDuration || 25} dk
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
            <Coffee className="w-5 h-5" />
            <span className="font-semibold">Kısa Mola</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeSession.pomodoroSettings?.shortBreak || 5} dk
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Uzun Mola</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeSession.pomodoroSettings?.longBreak || 15} dk
          </p>
        </div>
      </div>
    </div>
  );
};

export default PomodoroPage;
