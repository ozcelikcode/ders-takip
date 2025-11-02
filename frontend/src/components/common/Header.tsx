import { Menu, Search, Bell, User as UserIcon, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studySessionsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [readNotifications, setReadNotifications] = useState<Set<number>>(new Set());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load read notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('readNotifications');
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setReadNotifications(new Set(ids));
      } catch (e) {
        console.error('Failed to parse read notifications', e);
      }
    }
  }, []);

  // Fetch recent completed sessions for notifications
  const { data: recentSessions } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions({
        status: 'completed',
      });
      const sessions = response.data.data?.sessions || [];
      return sessions.slice(0, 5); // Last 5 completed sessions
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const markAsRead = (sessionId: number) => {
    const newReadSet = new Set(readNotifications);
    newReadSet.add(sessionId);
    setReadNotifications(newReadSet);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));
  };

  const markAllAsRead = () => {
    if (!recentSessions) return;
    const allIds = recentSessions.map((s: any) => s.id);
    const newReadSet = new Set(allIds);
    setReadNotifications(newReadSet);
    localStorage.setItem('readNotifications', JSON.stringify([...newReadSet]));
  };

  const unreadCount = recentSessions
    ? recentSessions.filter((s: any) => !readNotifications.has(s.id)).length
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
    <header className="bg-white dark:bg-gray-950 shadow-sm border-b border-gray-200 dark:border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search */}
            <div className="hidden md:block ml-4 lg:ml-0 lg:w-64">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Ara..."
                  className="block w-full pl-9 pr-16 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm hover:border-gray-400 dark:hover:border-gray-600"
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-1 flex items-center"
                >
                  <span className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-md transition-colors">
                    Ara
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-6 w-6" />
                {hasUnreadNotifications && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800"></span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-950 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Bildirimler {unreadCount > 0 && <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">({unreadCount})</span>}
                    </h3>
                    {recentSessions && recentSessions.length > 0 && unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Hepsini Okundu İşaretle
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {recentSessions && recentSessions.length > 0 ? (
                      recentSessions.map((session: any) => {
                        const isRead = readNotifications.has(session.id);
                        return (
                          <div
                            key={session.id}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors ${
                              isRead ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 dark:text-white">
                                  ✅ {session.title} tamamlandı
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {session.duration} dakika • {formatDistanceToNow(new Date(session.completedAt || session.endTime), {
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
                                  className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
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
                      <div className="px-4 py-8 text-center">
                        <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Henüz bildirim yok
                        </p>
                      </div>
                    )}
                  </div>
                  {recentSessions && recentSessions.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Kapat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
                  </p>
                </div>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-950 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profil
                  </a>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Ayarlar
                  </a>
                  <hr className="my-1 border-gray-200 dark:border-gray-600" />
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      useAuthStore.getState().logout();
                      setShowUserMenu(false);
                    }}
                  >
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
