import PasswordResetLinkDialog from '../../components/admin/PasswordResetLinkDialog';
import { useTerms } from '../../hooks/useTerms';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import type { ManagedUser } from '@study-tracker/contracts';
import {
  KeyRound,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CreateUserModal from '../../components/admin/CreateUserModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminPasswordField from '../../components/admin/AdminPasswordField';
import PageHeader from '../../components/common/PageHeader';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useText } from '../../store/languageStore';
import { useLocale } from '../../lib/locale';

type UserAction = { user: ManagedUser; kind: 'delete' | 'role' | 'status' };

function UserActionDialog({
  action,
  onClose,
}: {
  action: UserAction;
  onClose: () => void;
}) {
  const { roles, admin: text } = useText();
  const t = useTerms();
  const keys = useAccountQueryKeys();
  const mutation = useAccountMutation([keys.resource()]);
  const { user, kind } = action;
  const nextRole = user.role === 'admin' ? 'student' : 'admin';
  // Deleting an account and changing a role are confirmed with the administrator's password.
  const confirmed = kind !== 'status';
  const [confirmation, setConfirmation] = useState({ password: '', missing: false });
  const name = `${user.firstName} ${user.lastName}`;
  const title =
    kind === 'delete'
      ? text.deleteUser
      : kind === 'role'
        ? text.changeRole
        : user.isActive
          ? text.deactivate
          : text.activate;
  const message =
    kind === 'delete'
      ? text.deleteUserMessage(t, name)
      : kind === 'role'
        ? text.roleMessage(name, roles[nextRole], nextRole === 'admin')
        : text.statusMessage(name, user.isActive);
  return (
    <ConfirmDialog
      isOpen
      title={title}
      message={message}
      confirmText={kind === 'delete' ? text.deleteUser : text.apply}
      type={kind === 'delete' ? 'danger' : 'warning'}
      onClose={onClose}
      onConfirm={() => {
        const actor = useAuthStore.getState().user;
        if (actor?.role !== 'admin' || String(actor.id) === String(user.id))
          return false;
        if (confirmed && !confirmation.password) {
          setConfirmation({ password: '', missing: true });
          return false;
        }
        return mutation.save(
          () =>
            kind === 'delete'
              ? usersAPI.deleteUser(String(user.id), confirmation.password)
              : usersAPI.updateUser(
                  String(user.id),
                  kind === 'role'
                    ? { role: nextRole, adminPassword: confirmation.password }
                    : { isActive: !user.isActive },
                ),
          kind === 'delete' ? text.userDeleted : text.userUpdated,
        );
      }}
    >
      {confirmed && (
        <AdminPasswordField
          value={confirmation.password}
          missing={confirmation.missing}
          onChange={(password) => setConfirmation({ password, missing: false })}
        />
      )}
      {mutation.errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {mutation.errorMessage}
        </p>
      )}
    </ConfirmDialog>
  );
}

function UserManagement() {
  const { roles, admin: text } = useText();
  const { tag } = useLocale();
  const t = useTerms();
  const { user: currentUser } = useAuthStore();
  const keys = useAccountQueryKeys();
  const timezone = useUserPreferencesStore(
    (state) => state.preferences.timezone,
  );
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', page: 1 });
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<UserAction | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; isAdmin: boolean } | null>(null);
  const params = { ...filters, limit: 20, includeStats: true };
  const query = useQuery({
    queryKey: keys.resource('admin-users', params),
    queryFn: async () => {
      const response = await usersAPI.getUsers(params);
      if (!response.data.data) throw new Error('User list response is missing');
      return response.data.data;
    },
  });
  const data = query.data;
  // Deleting the last row on a page may reduce the number of pages.
  useEffect(() => {
    if (data && filters.page > Math.max(1, data.pagination.pages))
      setFilters((previous) => ({
        ...previous,
        page: Math.max(1, data.pagination.pages),
      }));
  }, [data, filters.page]);
  const date = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat(tag, {
          dateStyle: 'medium',
          timeZone: timezone,
        }).format(new Date(value))
      : text.never;
  return (
    <div className="space-y-6">
      <PageHeader
        title={text.usersTitle}
        description={
          data
            ? `${text.usersCount(data.pagination.total, !!filters.search)} · ${text.usersDescription}`
            : text.usersDescription
        }
        actions={
          <button
            className="btn btn-primary"
            disabled={!!action}
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" />
            {text.createUser}
          </button>
        }
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ search: search.trim(), page: 1 });
        }}
        className="flex max-w-2xl flex-wrap items-center gap-2"
        role="search"
        aria-label={text.searchUsers}
      >
        <div className="relative min-w-0 flex-1 basis-56">
          <label className="sr-only" htmlFor="admin-user-search">
            {text.userSearch}
          </label>
          <Search className="absolute left-3 top-3 h-4 w-4 text-(--muted)" />
          <input
            id="admin-user-search"
            className="input pl-9 pr-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.userSearchPlaceholder}
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-2 p-1 text-(--muted)"
              aria-label={text.clearSearch}
              onClick={() => {
                setSearch('');
                setFilters({ search: '', page: 1 });
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button className="btn btn-secondary" type="submit">
          {text.search}
        </button>
      </form>
      {query.isPending ? (
        <p
          className="py-8 text-center text-sm text-(--muted)"
          role="status"
        >
          {text.usersLoading}
        </p>
      ) : query.isError ? (
        <div className="panel p-6" role="alert">
          {text.usersLoadFailed}{' '}
          <button
            className="btn btn-secondary ml-2"
            onClick={() => void query.refetch()}
          >
            {text.retry}
          </button>
        </div>
      ) : (
        data && (
          <>
            <div className="space-y-3" aria-busy={query.isFetching}>
              {data.users.map((user) => {
                const self = String(user.id) === String(currentUser?.id);
                const name = `${user.firstName} ${user.lastName}`;
                return (
                  <article key={user.id} className="panel p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="avatar h-10 w-10 text-xs">
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="wrap-break-word text-sm font-medium">
                              {name}
                            </h2>
                            <span className="badge border text-(--muted)">
                              {roles[user.role]}
                            </span>
                            {!user.isActive && (
                              <span className="badge border text-(--muted)">
                                {text.inactive}
                              </span>
                            )}
                            {self && (
                              <span className="text-xs text-(--muted)">
                                {text.you}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 break-all text-xs text-(--muted)">
                            @{user.username} · {user.email}
                          </p>
                          <p className="mt-1 text-xs text-(--muted)">
                            {text.joinedOn(date(user.createdAt))}
                          </p>
                        </div>
                      </div>
                      <Menu as="div" className="relative shrink-0">
                        <MenuButton
                          className="icon-button"
                          aria-label={text.userActions(name)}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </MenuButton>
                        <MenuItems className="dropdown-panel w-56 py-1">
                          {(
                            [
                              {
                                kind: 'status',
                                label: user.isActive
                                  ? text.deactivateAction
                                  : text.activateAction,
                                icon: Shield,
                              },
                              {
                                kind: 'role',
                                label:
                                  user.role === 'admin'
                                    ? text.makeUser
                                    : text.makeAdmin,
                                icon: UserRound,
                              },
                              {
                                kind: 'delete',
                                label: text.deleteUser,
                                icon: Trash2,
                              },
                            ] as const
                          ).map((item) => (
                            <MenuItem
                              key={item.kind}
                              disabled={self || query.isFetching}
                            >
                              {({ focus, disabled }) => (
                                <button
                                  disabled={disabled}
                                  onClick={() =>
                                    setAction({ user, kind: item.kind })
                                  }
                                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm disabled:opacity-40 ${focus ? 'bg-(--subtle)' : ''} ${item.kind === 'delete' ? 'text-red-600' : ''}`}
                                >
                                  <item.icon className="h-4 w-4" />
                                  {item.label}
                                </button>
                              )}
                            </MenuItem>
                          ))}
                          <MenuItem disabled={self || !user.isActive}>
                            {({ focus, disabled }) => (
                              <button
                                disabled={disabled}
                                onClick={() => setResetTarget({ id: String(user.id), name, isAdmin: user.role === 'admin' })}
                                className={`flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm disabled:opacity-40 ${focus ? 'bg-(--subtle)' : ''}`}
                              >
                                <KeyRound className="h-4 w-4" />
                                {text.resetLinkTitle}
                              </button>
                            )}
                          </MenuItem>
                          {self && (
                            <p className="border-t px-4 py-2 text-xs text-(--muted)">
                              {text.selfLocked}
                            </p>
                          )}
                        </MenuItems>
                      </Menu>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                      {[
                        [text.totalSessions(t), user.stats?.totalSessions ?? '—'],
                        [text.completed, user.stats?.completedSessions ?? '—'],
                        [
                          text.measuredStudy,
                          user.stats
                            ? text.hours(Math.round(user.stats.studySeconds / 360) / 10)
                            : '—',
                        ],
                        [
                          text.lastActivity,
                          user.stats ? date(user.stats.lastActivity) : '—',
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs text-(--muted)">
                            {label}
                          </dt>
                          <dd className="mt-1 text-sm font-medium tabular-nums">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
              {data.users.length === 0 && (
                <p className="panel p-10 text-center text-sm text-(--muted)">
                  {filters.search
                    ? text.noUserMatch
                    : text.noUsersYet}
                </p>
              )}
            </div>
            <nav
              aria-label={text.userPages}
              className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
            >
              <p className="text-sm text-(--muted)">
                {text.page(data.pagination.current, Math.max(1, data.pagination.pages))} ·{' '}
                {text.usersCount(data.pagination.total, !!filters.search)}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary"
                  disabled={filters.page <= 1 || query.isFetching}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      page: previous.page - 1,
                    }))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                  {text.previous}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={
                    filters.page >= data.pagination.pages || query.isFetching
                  }
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      page: previous.page + 1,
                    }))
                  }
                >
                  {text.next}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          </>
        )
      )}
      <CreateUserModal isOpen={creating} onClose={() => setCreating(false)} />
      {resetTarget && (
        <PasswordResetLinkDialog
          userId={resetTarget.id}
          name={resetTarget.name}
          targetIsAdmin={resetTarget.isAdmin}
          onClose={() => setResetTarget(null)}
        />
      )}
      {action && (
        <UserActionDialog
          key={`${action.user.id}:${action.kind}`}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
export default function AdminUsersPage() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <UserManagement /> : null;
}
