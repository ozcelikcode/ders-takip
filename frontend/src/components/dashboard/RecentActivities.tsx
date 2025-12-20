import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle, Clock, Book } from 'lucide-react';

const RecentActivities = () => {
  // Son tamamlanan oturumları çek
  const { data: recentSessions, isLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({ status: 'completed' });
      const sessions = response.data.data?.sessions || [];
      // Son 5 oturumu göster
      return sessions.slice(0, 5);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!recentSessions || recentSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Henüz tamamlanmış aktivite yok
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[100%] overflow-y-auto pr-2 custom-scrollbar">
      {recentSessions.map((session: any) => (
        <div key={session.id} className="flex items-start space-x-3 group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="mt-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Book className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                {session.title}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {session.duration} dk
              </p>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <p className="text-xs text-gray-400 truncate">
                {formatDistanceToNow(new Date(session.completedAt || session.endTime), {
                  addSuffix: true,
                  locale: tr,
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentActivities;
