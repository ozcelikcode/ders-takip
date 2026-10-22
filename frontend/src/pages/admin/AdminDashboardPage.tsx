import { useTerms } from '../../hooks/useTerms';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useLanguage, useText } from '../../store/languageStore';
import { formatMeasuredSeconds } from '@study-tracker/contracts';

function AdminOverview() {
  const { roles, session: sessionText, admin: text } = useText();
  const language = useLanguage();
  const keys = useAccountQueryKeys();
  const t = useTerms();
  const overview = useQuery({
    queryKey: keys.resource('admin-overview'),
    queryFn: async () => {
      const response = await usersAPI.getAdminOverview();
      if (!response.data.data?.overview)
        throw new Error('Admin overview response is missing');
      return response.data.data.overview;
    },
  });
  const users = useQuery({
    queryKey: keys.resource('admin-dashboard-users'),
    queryFn: async () => {
      const response = await usersAPI.getUsers({ limit: 5 });
      if (!response.data.data?.users)
        throw new Error('Recent users response is missing');
      return response.data.data.users;
    },
  });
  const data = overview.data;
  const stats = data
    ? [
        {
          label: text.users,
          value: data.users.total,
          detail: text.activeAccounts(data.users.active),
        },
        {
          label: t.course({ plural: true, capitalize: true }),
          value: data.courses.total,
          detail: text.activeCourses(t, data.courses.active),
        },
        {
          label: t.session({ plural: true, capitalize: true }),
          value: data.sessions.totalSessions,
          detail: text.completedCount(data.sessions.completedSessions),
        },
        {
          label: text.measuredStudy,
          value: formatMeasuredSeconds(data.sessions.studySeconds, language),
          detail: text.measuredStudyDetail,
        },
      ]
    : [];
  const shortcuts = [
    {
      title: text.usersShortcut,
      detail: text.usersShortcutDetail,
      href: '/admin/users',
      icon: Users,
    },
    {
      title: text.coursesShortcut(t),
      detail: text.coursesShortcutDetail(t),
      href: '/admin/courses',
      icon: BookOpen,
    },
    {
      title: text.settingsShortcut,
      detail: text.settingsShortcutDetail,
      href: '/admin/settings',
      icon: Settings,
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title={text.overviewTitle}
        description={text.overviewDescription(t)}
      />
      <section aria-label={text.systemSummary} aria-busy={overview.isFetching}>
        {overview.isPending ? (
          <p role="status" className="panel p-6 text-sm text-(--muted)">
            {text.overviewLoading}
          </p>
        ) : overview.isError ? (
          <div
            role="alert"
            className="panel flex flex-wrap items-center gap-3 p-6"
          >
            <p>{text.overviewFailed}</p>
            <button
              className="btn btn-secondary"
              disabled={overview.isFetching}
              onClick={() => void overview.refetch()}
            >
              {text.overviewRetry}
            </button>
          </div>
        ) : (
          <dl className="panel grid grid-cols-1 divide-y divide-(--line) sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 p-5 sm:p-6">
                <dt className="text-xs text-(--muted)">{stat.label}</dt>
                <dd className="my-4 wrap-break-word text-3xl font-medium tracking-tight tabular-nums">
                  {stat.value}
                </dd>
                <dd className="text-xs leading-5 text-(--muted)">
                  {stat.detail}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <nav
        aria-label={text.shortcuts}
        className="grid gap-3 lg:grid-cols-3"
      >
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="panel group flex min-w-0 items-center gap-3 p-5 transition-colors hover:bg-(--subtle)"
          >
            <item.icon
              className="h-5 w-5 shrink-0 text-(--muted)"
              strokeWidth={1.5}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-(--muted)">
                {item.detail}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-(--muted)" />
          </Link>
        ))}
      </nav>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section
          className="panel min-w-0"
          aria-labelledby="recent-admin-users"
          aria-busy={users.isFetching}
        >
          <div className="panel-heading">
            <h2 id="recent-admin-users" className="text-sm font-medium">
              {text.recentUsers}
            </h2>
            <Link
              to="/admin/users"
              className="text-xs text-(--muted) underline"
            >
              {text.allUsers}
            </Link>
          </div>
          <div className="p-5">
            {users.isPending ? (
              <p role="status" className="text-sm text-(--muted)">
                {text.usersLoading}
              </p>
            ) : users.isError ? (
              <div role="alert" className="space-y-3">
                <p>{text.usersFailed}</p>
                <button
                  className="btn btn-secondary"
                  disabled={users.isFetching}
                  onClick={() => void users.refetch()}
                >
                  {text.usersRetry}
                </button>
              </div>
            ) : users.data.length === 0 ? (
              <p className="text-sm text-(--muted)">
                {text.noUsers}
              </p>
            ) : (
              <ul className="divide-y divide-(--line)">
                {users.data.map((user) => (
                  <li
                    key={user.id}
                    className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className="avatar h-8 w-8 shrink-0 text-xs"
                      aria-hidden="true"
                    >
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block wrap-break-word text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="mt-1 block break-all text-xs text-(--muted)">
                        {user.email}
                      </span>
                    </span>
                    <span className="badge shrink-0">
                      {roles[user.role]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section
          className="panel min-w-0"
          aria-labelledby="recent-admin-sessions"
        >
          <div className="panel-heading">
            <h2 id="recent-admin-sessions" className="text-sm font-medium">
              {text.recentSessions(t)}
            </h2>
          </div>
          <div className="p-5">
            {overview.isPending ? (
              <p role="status" className="text-sm text-(--muted)">
                {text.sessionsLoading(t)}
              </p>
            ) : overview.isError ? (
              <p role="status" className="text-sm text-(--muted)">
                {text.sessionsNeedOverview(t)}
              </p>
            ) : data?.recentSessions.length === 0 ? (
              <p className="text-sm text-(--muted)">
                {text.noSessions(t)}
              </p>
            ) : (
              <ul className="divide-y divide-(--line)">
                {data?.recentSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="wrap-break-word text-sm font-medium">
                        {session.title}
                      </p>
                      <p className="mt-1 wrap-break-word text-xs leading-5 text-(--muted)">
                        {text.sessionLine(
                          session.userName,
                          session.duration,
                          sessionText.types[session.sessionType as keyof typeof sessionText.types] ?? sessionText.otherType,
                        )}
                      </p>
                    </div>
                    <span className="badge">
                      {sessionText.statuses[session.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <AdminOverview /> : null;
}
