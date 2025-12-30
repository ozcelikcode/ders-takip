import { NavLink } from 'react-router-dom';
import { X, Home, BookOpen, Calendar, User, Users, Settings, LayoutDashboard, Timer, Sliders, GraduationCap } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Dersler', href: '/courses', icon: BookOpen },
    { name: 'Planlayıcı', href: '/planner', icon: Calendar },
    { name: 'Pomodoro', href: '/pomodoro', icon: Timer },
    { name: 'Profil', href: '/profile', icon: User },
    { name: 'Ayarlar', href: '/settings', icon: Settings },
  ];

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
    { name: 'Ders Yönetimi', href: '/admin/courses', icon: BookOpen },
    { name: 'Site Ayarları', href: '/admin/settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out lg:hidden border-r border-gray-200/50 dark:border-gray-700/50',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              {settings.siteName}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent
          navigation={navigation}
          adminNavigation={adminNavigation}
          user={user}
          onLinkClick={onClose}
        />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex-1 flex flex-col min-h-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                {settings.siteName}
              </h1>
            </div>
          </div>
          <SidebarContent
            navigation={navigation}
            adminNavigation={adminNavigation}
            user={user}
          />
        </div>
      </div>
    </>
  );
};

interface SidebarContentProps {
  navigation: any[];
  adminNavigation: any[];
  user: any;
  onLinkClick?: () => void;
}

const SidebarContent = ({ navigation, adminNavigation, user, onLinkClick }: SidebarContentProps) => {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto py-4">
      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onLinkClick}
            className={({ isActive }) =>
              clsx(
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={clsx(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                )} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="pt-6 pb-2">
              <div className="px-3 flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/50"></div>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Yönetim
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700/50"></div>
              </div>
            </div>
            <div className="space-y-1">
              {adminNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/20'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={clsx(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      )} />
                      {item.name}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
