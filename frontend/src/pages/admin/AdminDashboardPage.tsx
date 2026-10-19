import { useTerms } from '../../hooks/useTerms';
import { roleLabel } from '../../lib/roleLabels';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatMeasuredTime } from '../../utils/sessionHelpers';
import {
  sessionStatusLabels,
  sessionTypeLabels,
} from '../../utils/sessionPresentation';

function AdminOverview() {
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
          label: 'Kullanıcılar',
          value: data.users.total,
          detail: `${data.users.active} aktif hesap`,
        },
        {
          label: t.course({ plural: true, capitalize: true }),
          value: data.courses.total,
          detail: `${data.courses.active} aktif ${t.course()}`,
        },
        {
          label: t.session({ plural: true, capitalize: true }),
          value: data.sessions.totalSessions,
          detail: `${data.sessions.completedSessions} tamamlanan`,
        },
        {
          label: 'Ölçülen çalışma',
          value: formatMeasuredTime(data.sessions.studySeconds),
          detail: 'Tüm kullanıcılar · Mola ve duraklama hariç',
        },
      ]
    : [];
  const shortcuts = [
    {
      title: 'Kullanıcı yönetimi',
      detail: 'Hesaplar ve erişim yetkileri',
      href: '/admin/users',
      icon: Users,
    },
    {
      title: `${t.course({ capitalize: true })} yönetimi`,
      detail: `Ortak ve kişisel ${t.course({ plural: true })}`,
      href: '/admin/courses',
      icon: BookOpen,
    },
    {
      title: 'Site ayarları',
      detail: 'Site kimliği, kurallar ve yedekler',
      href: '/admin/settings',
      icon: Settings,
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Yönetim özeti"
        description={`Tüm kullanıcıların hesap, ${t.course()} ve çalışma verilerine genel bakış.`}
      />
      <section aria-label="Sistem özeti" aria-busy={overview.isFetching}>
        {overview.isPending ? (
          <p role="status" className="panel p-6 text-sm text-[var(--muted)]">
            Yönetim özeti yükleniyor…
          </p>
        ) : overview.isError ? (
          <div
            role="alert"
            className="panel flex flex-wrap items-center gap-3 p-6"
          >
            <p>Yönetim özeti alınamadı.</p>
            <button
              className="btn btn-secondary"
              disabled={overview.isFetching}
              onClick={() => void overview.refetch()}
            >
              Özeti tekrar yükle
            </button>
          </div>
        ) : (
          <dl className="panel grid grid-cols-1 divide-y divide-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 p-5 sm:p-6">
                <dt className="text-xs text-[var(--muted)]">{stat.label}</dt>
                <dd className="my-4 break-words text-3xl font-medium tracking-tight tabular-nums">
                  {stat.value}
                </dd>
                <dd className="text-xs leading-5 text-[var(--muted)]">
                  {stat.detail}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <nav
        aria-label="Yönetim kısayolları"
        className="grid gap-3 lg:grid-cols-3"
      >
        {shortcuts.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="panel group flex min-w-0 items-center gap-3 p-5 transition-colors hover:bg-[var(--subtle)]"
          >
            <item.icon
              className="h-5 w-5 shrink-0 text-[var(--muted)]"
              strokeWidth={1.5}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                {item.detail}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
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
              Son kullanıcılar
            </h2>
            <Link
              to="/admin/users"
              className="text-xs text-[var(--muted)] underline"
            >
              Tüm kullanıcılar
            </Link>
          </div>
          <div className="p-5">
            {users.isPending ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                Kullanıcılar yükleniyor…
              </p>
            ) : users.isError ? (
              <div role="alert" className="space-y-3">
                <p>Kullanıcılar alınamadı.</p>
                <button
                  className="btn btn-secondary"
                  disabled={users.isFetching}
                  onClick={() => void users.refetch()}
                >
                  Kullanıcıları tekrar yükle
                </button>
              </div>
            ) : users.data.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Henüz kullanıcı yok.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
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
                      <span className="block break-words text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="mt-1 block break-all text-xs text-[var(--muted)]">
                        {user.email}
                      </span>
                    </span>
                    <span className="badge shrink-0">
                      {roleLabel(user.role)}
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
              Son {t.session({ plural: true })}
            </h2>
          </div>
          <div className="p-5">
            {overview.isPending ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                {t.session({ plural: true, capitalize: true })} yükleniyor…
              </p>
            ) : overview.isError ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                {t.session({ plural: true, capitalize: true })} için yönetim özetini tekrar yükleyin.
              </p>
            ) : data?.recentSessions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Henüz {t.session()} yok.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {data?.recentSessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="break-words text-sm font-medium">
                        {session.title}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-[var(--muted)]">
                        {session.userName} · Plan: {session.duration} dakika ·{' '}
                        {sessionTypeLabels[
                          session.sessionType as keyof typeof sessionTypeLabels
                        ] ?? 'Diğer'}
                      </p>
                    </div>
                    <span className="badge">
                      {sessionStatusLabels[session.status]}
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
