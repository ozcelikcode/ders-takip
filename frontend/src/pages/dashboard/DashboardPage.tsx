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
  const totalTopics = coursesData?.reduce((sum: number, course: any) => sum + (course.topics?.length || 0), 0) || 0;
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
    <div className="h-[calc(100vh-130px)] flex flex-col gap-6 overflow-hidden pr-1">
      {/* Stats cards - Fixed height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="group p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center">
              <div className={`p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${stat.color} transition-colors group-hover:bg-primary-50 dark:group-hover:bg-primary-900/10`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                  {stat.title}
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions - Fixed height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <Link
          to="/courses"
          className="flex items-center p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all group"
        >
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-primary-600" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">Dersler</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">TYT & AYT müfredat takibi</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/planner"
          className="flex items-center p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all group"
        >
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-primary-600" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">Planlayıcı</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Haftalık çalışma takvimi</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/profile"
          className="flex items-center p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all group"
        >
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400 group-hover:text-primary-600" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">Hedefler</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Net ve başarı hedefleri</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Main content area - Flexible height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
        {/* Recent activity */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              Son Aktiviteler
            </h3>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Geçmiş</span>
          </div>
          <div className="flex-1 overflow-hidden p-3 overflow-y-auto custom-scrollbar">
            <RecentActivities />
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" />
              Haftalık İlerleme
            </h3>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Saat</span>
          </div>
          <div className="flex-1 min-h-[0] p-4 pr-6">
            <WeeklyProgressChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
