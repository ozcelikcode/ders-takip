import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Users, Calendar, BarChart3, MoreVertical, Shield, User, Mail, Clock } from 'lucide-react';
import CreateUserModal from '../../components/admin/CreateUserModal';
import { usersAPI, studySessionsAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@headlessui/react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await usersAPI.getUsers();
      return response.data.data?.users || [];
    },
  });

  const { data: userStatsData } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: async () => {
      if (!usersData) return {};

      const statsPromises = usersData.map(async (user: any) => {
        try {
          const sessionsResponse = await studySessionsAPI.getSessions({ userId: user.id });
          const sessions = sessionsResponse.data.data?.sessions || [];

          const completed = sessions.filter((s: any) => s.status === 'completed').length;
          const totalHours = sessions
            .filter((s: any) => s.status === 'completed')
            .reduce((total: number, s: any) => total + (s.duration / 60), 0);

          return {
            userId: user.id,
            totalSessions: sessions.length,
            completedSessions: completed,
            totalHours: Math.round(totalHours * 10) / 10,
            lastActivity: sessions.length > 0 ?
              sessions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt :
              null
          };
        } catch (error) {
          return {
            userId: user.id,
            totalSessions: 0,
            completedSessions: 0,
            totalHours: 0,
            lastActivity: null
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      return stats.reduce((acc, stat) => {
        acc[stat.userId] = stat;
        return acc;
      }, {} as any);
    },
    enabled: !!usersData && usersData.length > 0,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await usersAPI.deleteUser(userId);
    },
    onSuccess: () => {
      toast.success('Kullanıcı silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Silme işlemi başarısız');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      await usersAPI.updateUser(userId, updates);
    },
    onSuccess: () => {
      toast.success('Kullanıcı güncellendi');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
    },
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({
      userId,
      updates: { isActive: !currentStatus }
    });
  };

  const handleChangeUserRole = (userId: string, newRole: string) => {
    if (confirm(`Bu kullanıcının rolünü ${newRole} olarak değiştirmek istediğinizden emin misiniz?`)) {
      updateUserMutation.mutate({
        userId,
        updates: { role: newRole }
      });
    }
  };

  const filteredUsers = usersData?.filter((user: any) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'student': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'student': return 'Öğrenci';
      default: return role;
    }
  };



  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Toplam {usersData?.length || 0} kullanıcı
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ad, soyad, email veya kullanıcı adı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p>
                  {searchTerm ? 'Arama kriterlerine uygun kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          filteredUsers.map((user: any, index: number) => {
            const userStats = userStatsData?.[user.id] || {
              totalSessions: 0,
              completedSessions: 0,
              totalHours: 0,
              lastActivity: null
            };

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}
                          >
                            {getRoleText(user.role)}
                          </span>
                          {!user.isActive && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Pasif
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>@{user.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Katılma: {format(parseISO(user.createdAt), 'dd MMM yyyy', { locale: tr })}
                            </span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="font-semibold text-blue-600 dark:text-blue-400">
                              {userStats.totalSessions}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Toplam Seans</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="font-semibold text-green-600 dark:text-green-400">
                              {userStats.completedSessions}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Tamamlanan</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                            <div className="font-semibold text-purple-600 dark:text-purple-400">
                              {userStats.totalHours}h
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Toplam Saat</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-semibold text-gray-600 dark:text-gray-400">
                              {userStats.lastActivity ?
                                format(parseISO(userStats.lastActivity), 'dd/MM', { locale: tr }) :
                                'Hiç'
                              }
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Son Aktivite</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <Menu as="div" className="relative">
                      <Menu.Button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </Menu.Button>
                      <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleToggleUserStatus(user.id.toString(), user.isActive)}
                                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } text-gray-700 dark:text-gray-300`}
                              >
                                <Shield className="w-4 h-4" />
                                {user.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleChangeUserRole(
                                  user.id.toString(),
                                  user.role === 'admin' ? 'student' : 'admin'
                                )}
                                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } text-gray-700 dark:text-gray-300`}
                              >
                                <User className="w-4 h-4" />
                                {user.role === 'admin' ? 'Öğrenci Yap' : 'Admin Yap'}
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => handleDeleteUser(user.id.toString())}
                                className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                  active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } text-red-600 dark:text-red-400`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Sil
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Menu>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default AdminUsersPage;