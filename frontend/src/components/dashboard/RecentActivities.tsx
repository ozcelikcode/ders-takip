import { measuredSessionLabel } from '../../utils/sessionHelpers';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { getRecentSessions } from '../../utils/sessionHelpers';
import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { dateFnsLocale } from '../../lib/locale';
import { CheckCircle, Clock, Book } from 'lucide-react';

const RecentActivities = () => {
  const accountKeys = useAccountQueryKeys();
  // Fetch the most recently completed sessions
  const { data: recentSessions, isLoading, isError } = useQuery({
    queryKey: accountKeys.sessions('recent-activities'),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({ status: 'completed' });
      const sessions = response.data.data?.sessions || [];
      return getRecentSessions(sessions);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="h-2 w-2 bg-(--line) rounded-full"></div>
            <div className="h-4 bg-(--line) rounded-sm w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          Son aktiviteler yüklenirken bir hata oluştu
        </p>
      </div>
    );
  }

  if (!recentSessions || recentSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-6 w-6 text-(--muted) mx-auto mb-3" />
        <p className="text-sm text-(--muted)">
          Henüz tamamlanmış aktivite yok
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-full overflow-y-auto pr-2 custom-scrollbar">
      {recentSessions.map((session) => (
        <div key={session.id} className="flex items-start space-x-3 group p-2 rounded-lg hover:bg-(--subtle) transition-colors">
          <div className="mt-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Book className="h-3 w-3 text-(--muted) shrink-0" />
              <p className="text-sm font-medium truncate">
                {session.title}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-(--muted) shrink-0">
                {measuredSessionLabel(session)}
              </p>
              <span className="text-(--muted)">•</span>
              <p className="text-xs text-(--muted) truncate">
                {formatDistanceToNow(new Date(session.completedAt || session.endTime), {
                  addSuffix: true,
                  locale: dateFnsLocale,
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
