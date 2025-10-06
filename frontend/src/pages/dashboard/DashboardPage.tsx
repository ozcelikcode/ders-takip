import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ArrowRight, Clock, GraduationCap, Layers, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { coursesAPI, studySessionsAPI } from '../../services/api';
import WeeklyProgressChart from '../../components/dashboard/WeeklyProgressChart';
import RecentActivities from '../../components/dashboard/RecentActivities';

const DashboardPage = () => {
  // Fetch courses data
  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await coursesAPI.getCourses();
      return response.data.data?.courses || [];
    },
  });

  // Fetch all completed sessions for total study time
  const { data: sessionsData } = useQuery({
    queryKey: ['all-completed-sessions'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({ status: 'completed' });
      return response.data.data?.sessions || [];
    },
  });

  // Calculate stats
  const totalTopics = coursesData?.reduce((sum, course: any) => sum + (course.topics?.length || 0), 0) || 0;
  const tytCourses = coursesData?.filter((course: any) => course.category === 'TYT').length || 0;
  const aytCourses = coursesData?.filter((course: any) => course.category === 'AYT').length || 0;
  const totalStudyHours = Math.round((sessionsData?.reduce((sum: number, session: any) => sum + session.duration, 0) || 0) / 60);

  const stats = [
    { title: 'Toplam Konu', value: totalTopics, icon: BookOpen, color: 'text-blue-600' },
    { title: 'TYT Dersleri', value: tytCourses, icon: GraduationCap, color: 'text-green-600' },
    { title: 'AYT Dersleri', value: aytCourses, icon: Layers, color: 'text-purple-600' },
    { title: 'Toplam Çalışma', value: `${totalStudyHours}sa`, icon: Clock, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ders takip sisteminize genel bakış
          </p>
        </div>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="card-body">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Hızlı Erişim
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/courses"
              className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/40 transition-colors">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dersler</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">TYT & AYT dersleri</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </Link>

            <Link
              to="/planner"
              className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/40 transition-colors">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Planlayıcı</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Çalışma planı</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </Link>

            <Link
              to="/profile"
              className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Hedefler</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">Kişisel hedefler</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Son Aktiviteler
            </h3>
          </div>
          <div className="card-body">
            <RecentActivities />
          </div>
        </motion.div>

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Haftalık İlerleme (Son 7 Gün)
            </h3>
          </div>
          <div className="card-body">
            <WeeklyProgressChart />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;