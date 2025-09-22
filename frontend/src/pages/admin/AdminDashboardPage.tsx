import React from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Calendar, Settings, TrendingUp, Activity, Clock, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, coursesAPI, studySessionsAPI } from '../../services/api';

const AdminDashboardPage = () => {
  const { data: usersData } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: async () => {
      const response = await usersAPI.getUsers();
      return response.data.data?.users || [];
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ['admin-dashboard-courses'],
    queryFn: async () => {
      const response = await coursesAPI.getCourses();
      return response.data.data?.courses || [];
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['admin-dashboard-sessions'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions();
      return response.data.data?.sessions || [];
    },
  });

  const stats = {
    totalUsers: usersData?.length || 0,
    activeUsers: usersData?.filter((user: any) => user.isActive)?.length || 0,
    totalCourses: coursesData?.length || 0,
    activeCourses: coursesData?.filter((course: any) => course.isActive)?.length || 0,
    totalSessions: sessionsData?.length || 0,
    completedSessions: sessionsData?.filter((session: any) => session.status === 'completed')?.length || 0,
  };

  const quickActions = [
    {
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcıları görüntüle, düzenle ve yönet',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Ders Yönetimi',
      description: 'Dersler oluştur, düzenle ve yönet',
      icon: BookOpen,
      href: '/admin/courses',
      color: 'bg-green-500',
    },
    {
      title: 'Site Ayarları',
      description: 'Sistem ayarlarını yapılandır',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-purple-500',
    },
  ];

  const statCards = [
    {
      title: 'Toplam Kullanıcı',
      value: stats.totalUsers,
      subtitle: `${stats.activeUsers} aktif`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Toplam Ders',
      value: stats.totalCourses,
      subtitle: `${stats.activeCourses} aktif`,
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Çalışma Seansı',
      value: stats.totalSessions,
      subtitle: `${stats.completedSessions} tamamlanan`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Tamamlanma Oranı',
      value: stats.totalSessions > 0 ? `${Math.round((stats.completedSessions / stats.totalSessions) * 100)}%` : '0%',
      subtitle: 'Başarı oranı',
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Sistem genel durumu ve hızlı erişim menüsü
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={action.href}
                  className="card hover:shadow-lg transition-shadow group"
                >
                  <div className="card-body">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Son Kullanıcılar</h3>
            </div>
            <div className="space-y-3">
              {usersData?.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Öğrenci'}
                  </span>
                </div>
              ))}
              {(!usersData || usersData.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  Henüz kullanıcı yok
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Son Çalışma Seansları</h3>
            </div>
            <div className="space-y-3">
              {sessionsData?.slice(0, 5).map((session: any) => (
                <div key={session.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <div className={`w-3 h-3 rounded-full ${
                    session.status === 'completed' ? 'bg-green-500' :
                    session.status === 'in_progress' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.duration} dakika • {session.sessionType}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status === 'completed' ? 'Tamamlandı' :
                     session.status === 'in_progress' ? 'Devam Ediyor' :
                     'Planlandı'}
                  </span>
                </div>
              ))}
              {(!sessionsData || sessionsData.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  Henüz çalışma seansı yok
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;