import { useTerms } from '../../hooks/useTerms';
import { roleLabel } from '../../lib/roleLabels';
import { Popover } from '@headlessui/react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
  UserCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import NotificationsPanel from './NotificationsPanel';

interface HeaderProps {
  onMenuClick: () => void;
}
export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();
  const t = useTerms();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sectionName = pathname.startsWith('/admin')
    ? 'Yönetim'
    : {
        dashboard: 'Genel bakış',
        planner: 'Planlayıcı',
        stats: 'İstatistikler',
        search: 'Arama',
        courses: t.course({ capitalize: true, plural: true }),
        pomodoro: 'Pomodoro',
        profile: 'Profil',
        settings: 'Ayarlar',
      }[pathname.split('/')[1] || ''] || 'Çalışma alanı';
  const [searchTerm, setSearchTerm] = useState('');
  return (
    <header className="sticky top-0 z-30 border-b bg-(--surface)">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-10">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="icon-button lg:hidden"
              aria-label="Menüyü aç"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden items-center gap-3 text-xs text-(--muted) lg:flex">
              Çalışma alanı <span aria-hidden="true">/</span>
              <span className="font-medium text-(--text)">
                {sectionName}
              </span>
            </span>
            <form
              className="relative hidden md:block md:w-60 xl:ml-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (searchTerm.trim())
                  navigate(
                    `/search?q=${encodeURIComponent(searchTerm.trim())}`,
                  );
              }}
            >
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-(--muted)"
              />
              <input
                aria-label="Çalışma alanında ara"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`${t.course({ capitalize: true })}, ${t.topic()} veya ${t.session()} ara…`}
                className="input h-8 pl-9 pr-12 text-xs"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-2 min-w-6 text-xs text-(--muted) hover:text-(--text)"
              >
                Ara
              </button>
            </form>
          </div>
          <Popover.Group className="flex items-center gap-2">
            <Link to="/search" className="icon-button md:hidden" aria-label="Ara">
              <Search className="h-4 w-4" />
            </Link>
            <NotificationsPanel key={`${user?.id ?? 'anonymous'}`} />
            <Popover
              key={`account-${user?.id ?? 'anonymous'}`}
              className="relative"
            >
              {({ close }) => (
                <>
                  <Popover.Button
                    className="flex items-center gap-2 rounded-md p-1.5 hover:bg-(--subtle)"
                  >
                    <span className="sr-only">Hesap menüsü</span>
                    {' '}
                    <span className="avatar h-8 w-8">
                      {user?.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon
                          aria-hidden="true"
                          className="h-4 w-4 text-(--muted)"
                        />
                      )}
                    </span>
                    <span className="hidden text-left md:block">
                      <span className="block text-sm font-medium">
                        {user?.fullName}
                      </span>
                      {' '}
                      <span className="block text-xs text-(--muted)">
                        {user ? roleLabel(user.role) : ''}
                      </span>
                    </span>
                  </Popover.Button>
                  <Popover.Panel
                    focus
                    className="dropdown-panel w-56 py-2"
                    aria-label="Hesap bağlantıları"
                  >
                    <div className="border-b border-(--line) px-4 py-3">
                      <p className="text-sm font-medium">{user?.fullName}</p>
                      <p className="truncate text-xs text-(--muted)">
                        {user?.email}
                      </p>
                    </div>
                    <nav aria-label="Hesap">
                      <Link
                        to="/profile"
                        onClick={() => close()}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-(--subtle)"
                      >
                        <UserCircle aria-hidden="true" className="h-4 w-4" />
                        Profil
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => close()}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-(--subtle)"
                      >
                        <Settings aria-hidden="true" className="h-4 w-4" />
                        Ayarlar
                      </Link>
                    </nav>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        useAuthStore.getState().logout();
                      }}
                      className="flex w-full items-center gap-3 border-t border-(--line) px-4 py-3 text-left text-sm text-red-600 hover:bg-(--subtle)"
                    >
                      <LogOut aria-hidden="true" className="h-4 w-4" />
                      Çıkış Yap
                    </button>
                  </Popover.Panel>
                </>
              )}
            </Popover>
          </Popover.Group>
        </div>
      </div>
    </header>
  );
}
