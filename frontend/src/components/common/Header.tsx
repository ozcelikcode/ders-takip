import { useReadNotifications } from '../../hooks/useReadNotifications';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { getRecentSessions } from '../../utils/sessionHelpers';
import { Menu, Search, Bell, User as UserIcon, Check, CheckCheck, Settings, LogOut, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const accountKeys = useAccountQueryKeys();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sectionName = pathname.startsWith('/admin') ? 'Yönetim' : ({ dashboard: 'Genel bakış', planner: 'Planlayıcı', courses: 'Dersler', pomodoro: 'Pomodoro', profile: 'Profil', settings: 'Ayarlar' }[pathname.split('/')[1] || ''] || 'Çalışma alanı');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { ids: readNotifications, markRead } = useReadNotifications(user ? String(user.id) : null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch recent completed sessions for notifications
  const { data: recentSessions } = useQuery({
    queryKey: accountKeys.sessions('recent-notifications'),
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        status: 'completed',
      });
      const sessions = response.data.data?.sessions || [];
      return getRecentSessions(sessions);
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowUserMenu(false); setShowNotifications(false); }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const markAsRead = (sessionId: number) => markRead([sessionId]);
  const markAllAsRead = () => { if (recentSessions) markRead(recentSessions.map(session => session.id)); };

  const unreadCount = recentSessions
    ? recentSessions.filter((s) => !readNotifications.has(s.id)).length
    : 0;

  const hasUnreadNotifications = unreadCount > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-[var(--surface)]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-10">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="icon-button lg:hidden"
              aria-label="Menüyü aç"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </button>

            <span className="hidden items-center gap-3 text-xs text-[var(--muted)] lg:flex">Çalışma alanı <span className="text-gray-300 dark:text-gray-600">/</span><span className="font-medium text-[var(--text)]">{sectionName}</span></span>
            {/* Search */}
            <div className="hidden md:block md:w-60 xl:ml-6">
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  aria-label="Ders veya konu ara"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Ders veya konu ara..."
                  className="input h-8 pl-9 pr-12 text-xs"
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Ara
                </button>
              </form>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                className="icon-button relative"
                aria-label="Bildirimler" aria-expanded={showNotifications}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">

                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="dropdown-panel w-[min(320px,calc(100vw-32px))] py-1"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary-500" />
                        Bildirimler
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </h3>
                      {recentSessions && recentSessions.length > 0 && unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 font-medium transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Tümünü Oku
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {recentSessions && recentSessions.length > 0 ? (
                        recentSessions.map((session) => {
                          const isRead = readNotifications.has(session.id);
                          return (
                            <div
                              key={session.id}
                              className={`px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 border-b border-gray-100/80 dark:border-gray-700/30 transition-colors ${isRead ? 'opacity-50' : ''
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    </span>
                                    <span className="truncate font-medium">{session.title}</span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                                    {session.duration} dk • {formatDistanceToNow(new Date(session.completedAt || session.endTime), {
                                      addSuffix: true,
                                      locale: tr,
                                    })}
                                  </p>
                                </div>
                                {!isRead && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(session.id);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                    title="Okundu olarak işaretle"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Henüz bildirim yok
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center gap-2 rounded-md p-1.5 hover:bg-[var(--subtle)]"
                aria-label="Hesap menüsü" aria-expanded={showUserMenu}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="avatar h-8 w-8">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-[var(--muted)]" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
                  </p>
                </div>
              </button>

              {/* User dropdown menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="dropdown-panel w-56 py-2"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <UserCircle className="w-4 h-4 text-gray-400" />
                        Profil
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        Ayarlar
                      </Link>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700/50 pt-1">
                      <button
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        onClick={() => {
                          useAuthStore.getState().logout();
                          setShowUserMenu(false);
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

