import { Brand } from './Brand';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { NavLink, Link } from 'react-router-dom';
import { X, Home, BarChart3, BookOpen, Calendar, Users, Settings, LayoutDashboard, Timer, Sliders, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { Terms } from '@study-tracker/contracts';
import { useTerms } from '../../hooks/useTerms';
import { useAuthStore } from '../../store/authStore';
import { useText } from '../../store/languageStore';
import type { Text } from '../../i18n';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation = (text: Text['nav'], t: Terms): NavigationItem[] => [
  { name: text.overview, href: '/dashboard', icon: Home },
  { name: text.planner, href: '/planner', icon: Calendar },
  { name: text.stats, href: '/stats', icon: BarChart3 },
  { name: text.records(t), href: '/courses', icon: BookOpen },
  { name: text.pomodoro, href: '/pomodoro', icon: Timer },
];
const adminNavigation = (text: Text['nav'], t: Terms): NavigationItem[] => [
  { name: text.adminOverview, href: '/admin', icon: LayoutDashboard },
  { name: text.users, href: '/admin/users', icon: Users },
  { name: text.recordManagement(t), href: '/admin/courses', icon: BookOpen },
  { name: text.siteSettings, href: '/admin/settings', icon: Sliders },
];
const accountNavigation = (text: Text['nav']): NavigationItem[] => [
  { name: text.settings, href: '/settings', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const user = useAuthStore(state => state.user);
  const t = useTerms();
  const text = useText().nav;

  const renderLinks = (items: NavigationItem[]) => items.map(item => (
    <NavLink key={item.href} to={item.href} end={item.href === '/admin'} onClick={onClose}
      className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}>
      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span>{item.name}</span>
    </NavLink>
  ));

  const content = (
    <div className="flex h-full flex-col bg-(--sidebar)">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b px-5">
        <Link to="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight">
          <Brand />
        </Link>
        <button onClick={onClose} aria-label={text.closeMenu} className="icon-button ml-auto lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <nav aria-label={text.label} className="flex-1 overflow-y-auto px-3 py-6">
        <p className="nav-label">{text.workspace}</p>
        <div className="space-y-1">{renderLinks(navigation(text, t))}</div>
        {user?.role === 'admin' && <div className="mt-7"><p className="nav-label">{text.admin}</p><div className="space-y-1">{renderLinks(adminNavigation(text, t))}</div></div>}
        <div className="mt-7"><p className="nav-label">{text.account}</p><div className="space-y-1">{renderLinks(accountNavigation(text))}</div></div>
      </nav>
      <div className="mx-3 mb-4 rounded-lg border bg-(--surface) p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{text.focusReady}</div>
        <p className="text-xs leading-5 text-(--muted)">{text.focusHint(t)}</p>
        <Link to="/pomodoro" onClick={onClose} className="mt-3 flex items-center justify-between text-xs font-medium">{text.focusStart}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-4 text-xs text-(--muted)"><span className="avatar h-7 w-7 text-[10px]">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span><span className="truncate">{user?.fullName}</span></div>
    </div>
  );

  return <>
    <aside className="fixed inset-y-0 left-0 hidden w-[232px] border-r lg:block">{content}</aside>
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <DialogPanel className="fixed inset-y-0 left-0 w-[min(288px,85vw)] border-r">
        <DialogTitle className="sr-only">{text.menuTitle}</DialogTitle>
        {content}
      </DialogPanel>
    </Dialog>
  </>;
};

export default Sidebar;
