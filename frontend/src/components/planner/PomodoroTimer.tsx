import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Coffee, Target, Volume2, VolumeX } from 'lucide-react';
import { StudySession } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface PomodoroTimerProps {
  session: StudySession;
  onComplete?: () => void;
  onStop?: () => void;
}

type TimerPhase = 'work' | 'shortBreak' | 'longBreak';
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ session, onComplete, onStop }) => {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<TimerPhase>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);

  const pomodoroSettings = session.pomodoroSettings || {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    cyclesBeforeLongBreak: 4,
  };

  const updateSessionMutation = useMutation({
    mutationFn: async (data: { status?: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'paused'; notes?: string; productivity?: number }) => {
      const response = await studySessionsAPI.updateSession(session.id.toString(), data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (data: { notes?: string; productivity?: number }) => {
      const response = await studySessionsAPI.completeSession(session.id.toString(), data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Çalışma seansı tamamlandı!');
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
      onComplete?.();
    },
  });

  // Initialize timer
  useEffect(() => {
    if (session.status === 'in_progress') {
      setTimerStatus('running');
    }
    resetToCurrentPhase();
  }, [session]);

  // Timer countdown effect
  useEffect(() => {
    let interval: number;

    if (timerStatus === 'running' && timeLeft > 0) {
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

    return () => clearInterval(interval);
  }, [timerStatus, timeLeft]);

  const resetToCurrentPhase = () => {
    let duration = pomodoroSettings.workDuration;

    if (currentPhase === 'shortBreak') {
      duration = pomodoroSettings.shortBreak;
    } else if (currentPhase === 'longBreak') {
      duration = pomodoroSettings.longBreak;
    }

    setTimeLeft(duration * 60);
  };

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  const handlePhaseComplete = () => {
    playNotificationSound();

    if (currentPhase === 'work') {
      // Work phase completed, move to break
      const isLongBreakTime = currentCycle % pomodoroSettings.cyclesBeforeLongBreak === 0;
      const nextPhase: TimerPhase = isLongBreakTime ? 'longBreak' : 'shortBreak';

      setCurrentPhase(nextPhase);
      setCurrentCycle(prev => prev + 1);

      toast.success(`Çalışma tamamlandı! ${isLongBreakTime ? 'Uzun' : 'Kısa'} mola zamanı.`);

      if (autoStartBreaks) {
        startBreakPhase(nextPhase);
      } else {
        setTimerStatus('idle');
      }
    } else {
      // Break completed, back to work
      setCurrentPhase('work');
      setTimerStatus('idle');
      toast.success('Mola tamamlandı! Çalışma zamanı.');
    }
  };

  const startBreakPhase = (phase: TimerPhase) => {
    const duration = phase === 'longBreak' ? pomodoroSettings.longBreak : pomodoroSettings.shortBreak;
    setTimeLeft(duration * 60);
    setTimerStatus('running');
  };

  const handleStart = () => {
    if (timerStatus === 'idle') {
      resetToCurrentPhase();
    }
    setTimerStatus('running');

    if (session.status !== 'in_progress') {
      updateSessionMutation.mutate({ status: 'in_progress' });
    }
  };

  const handlePause = () => {
    setTimerStatus('paused');
  };

  const handleReset = () => {
    setTimerStatus('idle');
    setCurrentPhase('work');
    setCurrentCycle(1);
    resetToCurrentPhase();
  };

  const handleStop = () => {
    const completedCycles = Math.max(0, currentCycle - 1);
    const productivity = completedCycles >= pomodoroSettings.cyclesBeforeLongBreak ? 5 :
                        completedCycles >= 2 ? 4 :
                        completedCycles >= 1 ? 3 : 1;

    completeSessionMutation.mutate({
      notes: `${completedCycles} Pomodoro döngüsü tamamlandı`,
      productivity,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'work': return 'text-red-600 dark:text-red-400';
      case 'shortBreak': return 'text-green-600 dark:text-green-400';
      case 'longBreak': return 'text-primary-600 dark:text-primary-400';
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'work': return <Target className="w-5 h-5" />;
      case 'shortBreak': return <Coffee className="w-5 h-5" />;
      case 'longBreak': return <Coffee className="w-5 h-5" />;
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'work': return 'Çalışma Zamanı';
      case 'shortBreak': return 'Kısa Mola';
      case 'longBreak': return 'Uzun Mola';
    }
  };

  const progress = timeLeft > 0 ?
    (1 - (timeLeft / ((currentPhase === 'work' ? pomodoroSettings.workDuration :
                       currentPhase === 'shortBreak' ? pomodoroSettings.shortBreak :
                       pomodoroSettings.longBreak) * 60))) * 100 : 100;

  return (
    <div className="space-y-6">
      {/* Hidden audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
        <source src="/notification.wav" type="audio/wav" />
      </audio>

      {/* Timer Display */}
      <div className="text-center">
        <div className={`flex items-center justify-center gap-2 mb-2 ${getPhaseColor()}`}>
          {getPhaseIcon()}
          <span className="text-lg font-semibold">{getPhaseText()}</span>
        </div>

        <motion.div
          key={`${currentPhase}-${currentCycle}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-mono font-bold text-gray-900 dark:text-white mb-4"
        >
          {formatTime(timeLeft)}
        </motion.div>

        {/* Progress Ring */}
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200 dark:text-gray-700"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={currentPhase === 'work' ? 'text-red-500' :
                        currentPhase === 'shortBreak' ? 'text-green-500' : 'text-primary-500'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              style={{
                strokeDasharray: '339.292',
                strokeDashoffset: `${339.292 * (1 - progress / 100)}`,
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentCycle}/{pomodoroSettings.cyclesBeforeLongBreak}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {timerStatus === 'idle' || timerStatus === 'paused' ? (
            <motion.button
              key="play"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={handleStart}
              className="flex items-center justify-center w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
            >
              <Play className="w-6 h-6 ml-1" />
            </motion.button>
          ) : (
            <motion.button
              key="pause"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={handlePause}
              className="flex items-center justify-center w-12 h-12 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors"
            >
              <Pause className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={handleReset}
          className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handleStop}
          className="flex items-center justify-center w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>

      {/* Settings */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-600 dark:text-gray-400">Ses bildirimleri</span>
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoStartBreaks}
            onChange={(e) => setAutoStartBreaks(e.target.checked)}
            className="rounded"
          />
          <span className="text-gray-600 dark:text-gray-400">Otomatik mola başlat</span>
        </label>
      </div>

      {/* Session Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{session.title}</h3>
        {session.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{session.description}</p>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Döngü: {currentCycle}/{pomodoroSettings.cyclesBeforeLongBreak} |
          Çalışma: {pomodoroSettings.workDuration}dk |
          Kısa Mola: {pomodoroSettings.shortBreak}dk |
          Uzun Mola: {pomodoroSettings.longBreak}dk
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;