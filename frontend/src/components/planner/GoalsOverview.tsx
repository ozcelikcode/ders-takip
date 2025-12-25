import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Plus, Play, Timer, Clock, CheckCircle, AlertCircle, Book, RotateCcw, Check, Edit, Pause, Activity } from 'lucide-react';
import { StudySession } from '../../types/planner';
import { studySessionsAPI } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import CreateSessionModal from './CreateSessionModal';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog';
import { isSessionMissed, canStartSession, getSessionTextStyle, formatTime } from '../../utils/sessionHelpers';

const TodaysPlans: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const { data: sessionsData, isLoading: sessionsLoading, refetch } = useQuery({
    queryKey: ['todays-sessions'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log('🔍 GoalsOverview: Fetching sessions for date:', today);
      try {
        const response = await studySessionsAPI.getSessions({
          startDate: today,
          endDate: today,
        });
        console.log('✅ GoalsOverview: Sessions received:', response.data.data?.sessions);
        return response.data.data?.sessions || [];
      } catch (error: any) {
        console.error('❌ GoalsOverview: Error fetching sessions:', error.response?.data || error.message);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50';
      case 'in_progress': return 'bg-sky-50 text-sky-700 border-sky-200/50 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/50';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200/50 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';
      default: return 'bg-gray-50 text-gray-700 border-gray-200/50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/50';
    }
  };

  const getSessionTypeColor = (sessionType: string) => {
    switch (sessionType) {
      case 'study': return 'bg-sky-400';
      case 'pomodoro': return 'bg-rose-400';
      case 'review': return 'bg-emerald-400';
      case 'break': return 'bg-gray-400';
      default: return 'bg-sky-400';
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#10b981', '#4ade80', '#86efac'],
    });
  };

  const handleStartSession = async (session: StudySession) => {
    // Vakti geçmiş oturumlar başlatılamaz
    if (!canStartSession(session)) {
      toast.error('Bu oturum için zaman geçmiş. Lütfen oturum saatini güncelleyin.');
      return;
    }

    try {
      await studySessionsAPI.startSession(session.id.toString());
      toast.success('Çalışma seansı başlatıldı');
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
          await studySessionsAPI.updateSession(session.id.toString(), {
            status: 'paused',
          });
          toast.success('Çalışma seansı duraklatıldı');
          refetch();
        } catch (error) {
          toast.error('Seans duraklatılırken hata oluştu');
        }
      },
    });
  };

  const handleRestartSession = (session: StudySession) => {
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
          refetch();
        } catch (error) {
          toast.error('Oturum güncellenirken hata oluştu');
        }
      },
    });
  };

  const handleEditSession = (session: StudySession) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  const getSessionStatusIcon = (session: StudySession) => {
    const now = new Date();
    const sessionStart = parseISO(session.startTime);
    const sessionEnd = parseISO(session.endTime);

    if (session.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (session.status === 'in_progress') {
      return <Activity className="w-4 h-4 text-primary-600" />;
    } else if (session.status === 'paused') {
      return <Pause className="w-4 h-4 text-orange-600" />;
    } else if (isBefore(now, sessionStart)) {
      return <Clock className="w-4 h-4 text-gray-600" />;
    } else if (isAfter(now, sessionEnd)) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const sortedSessions = sessionsData?.sort((a, b) =>
    parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
  ) || [];

  const completedSessions = sortedSessions.filter(s => s.status === 'completed').length;
  const totalSessions = sortedSessions.length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  // Kaçırılan görevler için uyarı
  useEffect(() => {
    if (!sessionsData || sessionsData.length === 0) return;

    const missedSessions = sessionsData.filter(isSessionMissed);
    if (missedSessions.length > 0) {
      toast(`${missedSessions.length} görev tamamlanamadı`, {
        id: 'missed-sessions-warning',
        duration: 5000,
        icon: '⚠️',
      });
    }
  }, [sessionsData]);

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

  if (sessionsLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - iOS Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/30">
            <CalendarIcon className="w-5 h-5 text-sky-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Bugünün Planları
          </h2>
          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {totalSessions} seans, {completionRate}% tamamlandı
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Yeni Seans
        </button>
      </div>

      {/* Today's Sessions - iOS Style Cards */}
      {sortedSessions.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-center py-12 px-6">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 w-fit mx-auto mb-4">
              <CalendarIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Bugün için planlanmış seans yok
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Bugün için çalışma seansı oluşturmak ister misiniz?
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              İlk Seansımı Oluştur
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session, index) => {
            const sessionStart = parseISO(session.startTime);
            const sessionEnd = parseISO(session.endTime);

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm hover:shadow-lg border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ${session.status === 'completed' ? 'opacity-70' : ''
                  }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Left side - Session info */}
                    <div className="flex items-center gap-4">
                      {/* Time and type indicator */}
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatTime(sessionStart)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {session.duration}dk
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full mt-1 ${getSessionTypeColor(session.sessionType)}`}
                          title={session.sessionType}
                        />
                      </div>

                      {/* Session details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Book className="w-4 h-4 text-gray-500" />
                          <h3 className={`font-medium text-gray-900 dark:text-white truncate ${getSessionTextStyle(session)}`}>
                            {session.title}
                          </h3>
                          {session.sessionType === 'pomodoro' && (
                            <Timer className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        {session.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {session.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSessionStatusColor(session.status)}`}>
                            {session.status === 'completed' && <Check className="w-3 h-3 mr-1" />}
                            {session.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                            {session.status === 'completed' ? 'Tamamlandı' :
                              session.status === 'in_progress' ? 'Devam Ediyor' :
                                session.status === 'paused' ? 'Duraklatıldı' :
                                  session.status === 'cancelled' ? 'İptal Edildi' : 'Planlandı'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(sessionStart)} - {formatTime(sessionEnd)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Status and actions */}
                    <div className="flex items-center gap-2">
                      {getSessionStatusIcon(session)}
                      <button
                        onClick={() => handleEditSession(session)}
                        className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {session.status === 'planned' && canStartSession(session) && (
                        <button
                          onClick={() => handleStartSession(session)}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                          title="Başlat"
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handlePauseSession(session)}
                            className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
                            title="Duraklat"
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
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
                                    refetch();
                                  } catch (error) {
                                    toast.error('Seans tamamlanırken hata oluştu');
                                  }
                                },
                              });
                            }}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                            title="Tamamla"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {session.status === 'paused' && (
                        <>
                          <button
                            onClick={() => handleStartSession(session)}
                            className="p-2 text-primary-600 dark:text-blue-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                            title="Devam Et"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {session.status === 'completed' && (
                        <button
                          onClick={() => handleRestartSession(session)}
                          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
                          title="Tekrar Başlat"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          refetch(); // Force refetch when modal closes
        }}
        selectedDate={new Date()}
        selectedHour={new Date().getHours()}
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

export default TodaysPlans;