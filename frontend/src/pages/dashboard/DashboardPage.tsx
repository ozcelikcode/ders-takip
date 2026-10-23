import { useTerms } from '../../hooks/useTerms';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Calendar, Clock, CheckCircle, Layers, Plus, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../lib/locale';
import RecentActivities from '../../components/dashboard/RecentActivities';
import WeeklyProgressChart from '../../components/dashboard/WeeklyProgressChart';
import PageHeader from '../../components/common/PageHeader';
import { coursesWithTopicsQuery } from '../../lib/accountQueries';
import { studySessionsAPI } from '../../services/api';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useAuthStore } from '../../store/authStore';
import GoalProgress from '../../components/dashboard/GoalProgress';
import { isOwnOrShared } from '../../lib/catalogAccess';
import type { CatalogCourse } from '../../types/catalog';
import Recommendations from '../../components/dashboard/Recommendations';
import { formatMeasuredSeconds } from '@study-tracker/contracts';
import { useText } from '../../store/languageStore';

/** "19 Ekim 2026, Pazartesi" in the user's zone, via Intl so the dashboard does not need luxon. */
const todayLabel = (timeZone: string, locale: string) => {
  const now = new Date();
  const day = new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(now);
  return `${day}, ${weekday}`;
};

const DashboardPage = () => {
  const { tag: localeTag, language } = useLocale();
  const accountKeys = useAccountQueryKeys();
  const t = useTerms();
  const text = useText().dashboard;
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const user = useAuthStore(state => state.user);
  const firstName = user?.firstName;
  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useQuery({
    ...coursesWithTopicsQuery(accountKeys),
    // Admins can list everyone's records; the personal dashboard counts only their own and shared ones.
    select: response => ((response.data.data?.courses || []) as CatalogCourse[]).filter(course => isOwnOrShared(course, user)),
  });
  const { data: statsData, isLoading: sessionsLoading, isError: sessionsError } = useQuery({
    queryKey: accountKeys.sessions('measured-stats'),
    queryFn: async () => (await studySessionsAPI.getStats()).data.data?.stats,
  });

  const stats = [
    { label: t.course({ plural: true, capitalize: true }), value: courses?.length || 0, detail: text.recordsDetail(t), icon: BookOpen, loading: coursesLoading, error: coursesError },
    { label: t.topic({ plural: true, capitalize: true }), value: courses?.reduce((sum, course) => sum + (course.topics?.length || 0), 0) || 0, detail: text.subRecordsDetail(t), icon: Layers, loading: coursesLoading, error: coursesError },
    { label: text.completedSessions(t), value: statsData?.completedSessions || 0, detail: text.allTime, icon: CheckCircle, loading: sessionsLoading, error: sessionsError },
    { label: text.measured, value: formatMeasuredSeconds(statsData?.studySeconds ?? 0, language), detail: statsData?.untrackedSessions || statsData?.partialSessions ? text.measuredExcludesOld : text.measuredExcludesBreaks, icon: Clock, loading: sessionsLoading, error: sessionsError },
  ];
  const shortcuts = [
    { title: text.planWeek, description: text.planWeekHint, href: '/planner', icon: Calendar },
    { title: text.browseRecords(t), description: text.browseRecordsHint(t), href: '/courses', icon: BookOpen },
    { title: text.focus, description: text.focusHint(t), href: '/pomodoro', icon: Timer },
  ];

  return (
    <div className="space-y-7">
      <PageHeader eyebrow={todayLabel(timezone, localeTag)}
        title={text.greeting(firstName)}
        description={text.description}
        actions={<Link to="/planner" className="btn btn-primary"><Plus className="h-4 w-4" />{text.planSession(t)}</Link>} />

      <section aria-label={text.summary} className="panel grid grid-cols-2 divide-x divide-(--line) lg:grid-cols-4">
        {stats.map((stat, index) => <div key={stat.label} className={`p-5 sm:p-6 ${index > 1 ? 'border-t lg:border-t-0' : ''}`}>
          <div className="flex items-center justify-between gap-3 text-xs text-(--muted)"><span>{stat.label}</span><stat.icon className="h-4 w-4" strokeWidth={1.6} /></div>
          <p className="my-4 text-[30px] font-medium leading-none tracking-tight tabular-nums">{stat.loading ? '—' : stat.error ? '—' : stat.value}</p>
          <p className={`text-[11px] leading-5 ${stat.error ? 'text-red-600 dark:text-red-400' : 'text-(--muted)'}`}>{stat.error ? text.loadFailed : stat.detail}</p>
        </div>)}
      </section>

      <Recommendations />

      <GoalProgress />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <section className="panel min-w-0">
          <div className="panel-heading"><div><h2 className="text-sm font-medium">{text.weeklyProgress}</h2><p className="mt-1 text-xs text-(--muted)">{text.weeklyProgressHint}</p></div><span className="badge badge-gray">{text.thisWeek}</span></div>
          <div className="h-[300px] px-5 pb-5 pt-7"><WeeklyProgressChart /></div>
        </section>
        <section className="panel min-w-0">
          <div className="panel-heading"><div><h2 className="text-sm font-medium">{text.recentActivity}</h2><p className="mt-1 text-xs text-(--muted)">{text.recentActivityHint}</p></div><Link to="/planner" className="icon-button" aria-label={text.goToPlanner}><ArrowRight className="h-4 w-4" /></Link></div>
          <div className="min-h-[300px] p-4"><RecentActivities /></div>
        </section>
      </div>

      <section aria-label={text.shortcuts} className="grid gap-3 md:grid-cols-3">
        {shortcuts.map(item => <Link key={item.href} to={item.href} className="group flex items-center gap-4 rounded-lg border bg-(--surface) p-5 transition-colors hover:border-gray-400 dark:hover:border-gray-500">
          <item.icon className="h-5 w-5 shrink-0 text-(--muted)" strokeWidth={1.5} />
          <div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{item.title}</h2><p className="mt-1 text-xs leading-5 text-(--muted)">{item.description}</p></div><ArrowRight className="h-4 w-4 text-(--muted)" />
        </Link>)}
      </section>
    </div>
  );
};

export default DashboardPage;
