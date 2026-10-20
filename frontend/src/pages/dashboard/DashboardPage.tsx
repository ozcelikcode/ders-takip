import { lazy, Suspense } from 'react';
import { useTerms } from '../../hooks/useTerms';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Calendar, Clock, CheckCircle, Layers, Plus, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appLocale } from '../../lib/locale';
import RecentActivities from '../../components/dashboard/RecentActivities';
import PageHeader from '../../components/common/PageHeader';
import { coursesAPI, studySessionsAPI } from '../../services/api';
import { formatMeasuredTime } from '../../utils/sessionHelpers';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useAuthStore } from '../../store/authStore';
import GoalProgress from '../../components/dashboard/GoalProgress';
import { isOwnOrShared } from '../../lib/catalogAccess';
import type { CatalogCourse } from '../../types/catalog';
import Recommendations from '../../components/dashboard/Recommendations';

/** "19 Ekim 2026, Pazartesi" in the user's zone, via Intl so the dashboard does not need luxon. */
const todayLabel = (timeZone: string) => {
  const now = new Date();
  const day = new Intl.DateTimeFormat(appLocale, { timeZone, day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const weekday = new Intl.DateTimeFormat(appLocale, { timeZone, weekday: 'long' }).format(now);
  return `${day}, ${weekday}`;
};

// The chart library is the largest dependency; loading it after the summary keeps it off the first paint.
const WeeklyProgressChart = lazy(() => import('../../components/dashboard/WeeklyProgressChart'));

const DashboardPage = () => {
  const accountKeys = useAccountQueryKeys();
  const t = useTerms();
  const timezone = useUserPreferencesStore(state => state.preferences.timezone);
  const user = useAuthStore(state => state.user);
  const firstName = user?.firstName;
  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useQuery({
    queryKey: accountKeys.catalog('courses', { includeTopics: true }),
    queryFn: () => coursesAPI.getCourses({ includeTopics: true }),
    // Admins can list everyone's records; the personal dashboard counts only their own and shared ones.
    select: response => ((response.data.data?.courses || []) as CatalogCourse[]).filter(course => isOwnOrShared(course, user)),
  });
  const { data: statsData, isLoading: sessionsLoading, isError: sessionsError } = useQuery({
    queryKey: accountKeys.sessions('measured-stats'),
    queryFn: async () => (await studySessionsAPI.getStats()).data.data?.stats,
  });

  const stats = [
    { label: t.course({ plural: true, capitalize: true }), value: courses?.length || 0, detail: `Çalışma alanındaki ${t.course({ plural: true })}`, icon: BookOpen, loading: coursesLoading, error: coursesError },
    { label: t.topic({ plural: true, capitalize: true }), value: courses?.reduce((sum, course) => sum + (course.topics?.length || 0), 0) || 0, detail: `${t.course({ case: 'dat', plural: true, capitalize: true })} bağlı ${t.topic({ plural: true })}`, icon: Layers, loading: coursesLoading, error: coursesError },
    { label: `Tamamlanan ${t.session()}`, value: statsData?.completedSessions || 0, detail: 'Tüm zamanlar', icon: CheckCircle, loading: sessionsLoading, error: sessionsError },
    { label: 'Ölçülen çalışma', value: formatMeasuredTime(statsData?.studySeconds ?? 0), detail: statsData?.untrackedSessions || statsData?.partialSessions ? 'Ölçülmemiş eski süreler toplama dahil değil' : 'Mola ve duraklama hariç', icon: Clock, loading: sessionsLoading, error: sessionsError },
  ];
  const shortcuts = [
    { title: 'Haftanı planla', description: 'Çalışmalarına takvimde yer aç.', href: '/planner', icon: Calendar },
    { title: `${t.course({ case: 'dat', plural: true, capitalize: true })} göz at`, description: `${t.topic({ case: 'acc', plural: true, capitalize: true })} ve kaynakları düzenle.`, href: '/courses', icon: BookOpen },
    { title: 'Odağını topla', description: `Pomodoro ile bir ${t.session({ case: 'dat' })} başla.`, href: '/pomodoro', icon: Timer },
  ];

  return (
    <div className="space-y-7">
      <PageHeader eyebrow={todayLabel(timezone)}
        title={`Merhaba${firstName ? `, ${firstName}` : ''}.`}
        description="Çalışmalarına bir adım uzaktan bak. Sıradaki adımını planla."
        actions={<Link to="/planner" className="btn btn-primary"><Plus className="h-4 w-4" />{t.session({ capitalize: true })} planla</Link>} />

      <section aria-label="Çalışma özeti" className="panel grid grid-cols-2 divide-x divide-[var(--line)] lg:grid-cols-4">
        {stats.map((stat, index) => <div key={stat.label} className={`p-5 sm:p-6 ${index > 1 ? 'border-t lg:border-t-0' : ''}`}>
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]"><span>{stat.label}</span><stat.icon className="h-4 w-4" strokeWidth={1.6} /></div>
          <p className="my-4 text-[30px] font-medium leading-none tracking-tight tabular-nums">{stat.loading ? '—' : stat.error ? '—' : stat.value}</p>
          <p className={`text-[11px] leading-5 ${stat.error ? 'text-red-600 dark:text-red-400' : 'text-[var(--muted)]'}`}>{stat.error ? 'Veriler alınamadı' : stat.detail}</p>
        </div>)}
      </section>

      <Recommendations />

      <GoalProgress />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <section className="panel min-w-0">
          <div className="panel-heading"><div><h2 className="text-sm font-medium">Haftalık ilerleme</h2><p className="mt-1 text-xs text-[var(--muted)]">Günlere bölünmüş ölçülen çalışma; molalar hariç</p></div><span className="badge badge-gray">Bu hafta</span></div>
          <div className="h-[300px] px-5 pb-5 pt-7"><Suspense fallback={<p role="status" className="text-sm text-[var(--muted)]">Grafik yükleniyor…</p>}><WeeklyProgressChart /></Suspense></div>
        </section>
        <section className="panel min-w-0">
          <div className="panel-heading"><div><h2 className="text-sm font-medium">Son aktiviteler</h2><p className="mt-1 text-xs text-[var(--muted)]">Tamamladığın son çalışmalar</p></div><Link to="/planner" className="icon-button" aria-label="Planlayıcıya git"><ArrowRight className="h-4 w-4" /></Link></div>
          <div className="min-h-[300px] p-4"><RecentActivities /></div>
        </section>
      </div>

      <section aria-label="Hızlı erişim" className="grid gap-3 md:grid-cols-3">
        {shortcuts.map(item => <Link key={item.href} to={item.href} className="group flex items-center gap-4 rounded-lg border bg-[var(--surface)] p-5 transition-colors hover:border-gray-400 dark:hover:border-gray-500">
          <item.icon className="h-5 w-5 shrink-0 text-[var(--muted)]" strokeWidth={1.5} />
          <div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{item.title}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p></div><ArrowRight className="h-4 w-4 text-[var(--muted)]" />
        </Link>)}
      </section>
    </div>
  );
};

export default DashboardPage;
