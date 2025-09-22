import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Plus, Edit2, Trash2, Users, Filter, Search } from 'lucide-react';
import { StudySession } from '../../types/planner';
import { studySessionsAPI, plansAPI, usersAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { tr } from 'date-fns/locale';
import CreateSessionModal from '../planner/CreateSessionModal';
import toast from 'react-hot-toast';

const AdminScheduleManager: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number>(9);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const queryClient = useQueryClient();

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
  const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  // Fetch all users for selection
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await usersAPI.getUsers();
      return response.data.data?.users || [];
    },
  });

  // Fetch sessions for selected user and week
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['admin-sessions', selectedUserId, currentWeek],
    queryFn: async () => {
      if (!selectedUserId) return [];

      const weekStart = format(currentWeek, 'yyyy-MM-dd');
      const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      const response = await studySessionsAPI.getSessions({
        userId: selectedUserId,
        startDate: weekStart,
        endDate: weekEnd,
      });
      return response.data.data?.sessions || [];
    },
    enabled: !!selectedUserId,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await studySessionsAPI.deleteSession(sessionId);
    },
    onSuccess: () => {
      toast.success('Seans silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Silme işlemi başarısız');
    },
  });

  const getSessionsForTimeSlot = (dayIndex: number, hour: number): StudySession[] => {
    if (!sessionsData) return [];

    return sessionsData.filter((session) => {
      const sessionStart = parseISO(session.startTime);
      const sessionDay = (sessionStart.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      const sessionHour = sessionStart.getHours();
      const sessionMinutes = sessionStart.getMinutes();
      const sessionStartInMinutes = sessionHour * 60 + sessionMinutes;
      const slotStartInMinutes = hour * 60;
      const slotEndInMinutes = (hour + 1) * 60;

      return sessionDay === dayIndex &&
             sessionStartInMinutes >= slotStartInMinutes &&
             sessionStartInMinutes < slotEndInMinutes;
    });
  };

  const handleCreateSession = (date: Date, hour: number) => {
    if (!selectedUserId) {
      toast.error('Önce bir kullanıcı seçin');
      return;
    }
    setSelectedDate(date);
    setSelectedHour(hour);
    setIsCreateModalOpen(true);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Bu seansı silmek istediğinizden emin misiniz?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
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
      case 'in_progress': return 'ring-2 ring-yellow-400';
      case 'cancelled': return 'opacity-40 bg-gray-400';
      default: return '';
    }
  };

  const selectedUser = usersData?.find((user: any) => user.id.toString() === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Takvim Yönetimi
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Kullanıcıların çalışma seanslarını yönet
          </p>
        </div>
      </div>

      {/* User Selection */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kullanıcı Seç
              </label>
              <select
                id="userSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Kullanıcı seçin</option>
                {usersData?.map((user: any) => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            {selectedUser && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Seçili:</strong> {selectedUser.firstName} {selectedUser.lastName}</p>
                <p>Role: {selectedUser.role}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUserId ? (
        <>
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                ←
              </button>
              <button
                onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Bu Hafta
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                →
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

                    return (
                      <div
                        key={day}
                        className="p-4 text-center border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {day}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
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
                      const dayDate = addDays(currentWeek, dayIndex);

                      return (
                        <div
                          key={`${dayIndex}-${hour}`}
                          className="relative min-h-[60px] border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          onClick={() => handleCreateSession(dayDate, hour)}
                        >
                          <AnimatePresence>
                            {sessions.length === 0 ? (
                              <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                              </div>
                            ) : (
                              sessions.map((session, sessionIndex) => (
                                <motion.div
                                  key={session.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className={`absolute inset-x-1 top-1 p-2 rounded border text-xs text-white group ${
                                    getSessionTypeColor(session.sessionType)
                                  } ${getStatusColor(session.status)}`}
                                  style={{
                                    top: `${4 + sessionIndex * 28}px`,
                                    zIndex: 10,
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{session.title}</div>
                                      {session.duration && (
                                        <div className="opacity-75">{session.duration} dk</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSession(session);
                                        }}
                                        className="p-1 hover:bg-white/20 rounded"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSession(session.id.toString());
                                        }}
                                        className="p-1 hover:bg-white/20 rounded"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bu Hafta</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {sessionsData?.length || 0} seans
                    </p>
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tamamlanan</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {sessionsData?.filter(s => s.status === 'completed').length || 0} seans
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Süre</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {Math.floor((sessionsData?.filter(s => s.status === 'completed').reduce((total, s) => total + s.duration, 0) || 0) / 60)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Kullanıcı Seçin
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Takvim yönetimi için yukarıdan bir kullanıcı seçin
            </p>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default AdminScheduleManager;