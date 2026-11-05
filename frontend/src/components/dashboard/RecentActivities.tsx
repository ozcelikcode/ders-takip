import { measuredSessionLabel } from '../../utils/sessionHelpers';
import { useRecentSessions } from '../../hooks/useRecentSessions';
import { formatDistanceToNow } from 'date-fns';
import { useLocale } from '../../lib/locale';
import { CheckCircle, Clock, Book } from 'lucide-react';
import { useLanguage, useText } from '../../store/languageStore';

const RecentActivities = () => {
  const language = useLanguage();
  const sessionText = useText().session;
  const text = useText().activity;
  const { dateFns } = useLocale();
  const { data: recentSessions, isLoading, isError } = useRecentSessions();

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
          {text.failed}
        </p>
      </div>
    );
  }

  if (!recentSessions || recentSessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-6 w-6 text-(--muted) mx-auto mb-3" />
        <p className="text-sm text-(--muted)">
          {text.empty}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-(--line)">
      {recentSessions.map((session) => (
        <div key={session.id} className="flex items-start gap-3 px-1 py-2.5">
          <div className="mt-1">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Book className="h-3 w-3 text-(--muted) shrink-0" />
              <p className="text-sm font-medium truncate">
                {session.title}
              </p>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-xs text-(--muted) shrink-0">
                {measuredSessionLabel(session, sessionText, language)}
              </p>
              <span className="text-(--muted)">•</span>
              <p className="text-xs text-(--muted) truncate">
                {formatDistanceToNow(new Date(session.completedAt || session.endTime), {
                  addSuffix: true,
                  locale: dateFns,
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
