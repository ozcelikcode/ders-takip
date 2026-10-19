import { Brand } from './Brand';
import { Dialog } from '@headlessui/react';
import { NavLink, Link } from 'react-router-dom';
import { X, Home, BookOpen, Calendar, User, Users, Settings, LayoutDashboard, Timer, Sliders, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { Terms } from '@study-tracker/contracts';
import { useTerms } from '../../hooks/useTerms';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation = (t: Terms): NavigationItem[] => [
  { name: 'Genel bakış', href: '/dashboard', icon: Home },
  { name: 'Planlayıcı', href: '/planner', icon: Calendar },
  { name: t.course({ capitalize: true, plural: true }), href: '/courses', icon: BookOpen },
  { name: 'Pomodoro', href: '/pomodoro', icon: Timer },
];
const adminNavigation = (t: Terms): NavigationItem[] => [
  { name: 'Yönetim özeti', href: '/admin', icon: LayoutDashboard },
  { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
  { name: `${t.course({ capitalize: true })} yönetimi`, href: '/admin/courses', icon: BookOpen },
  { name: 'Site ayarları', href: '/admin/settings', icon: Sliders },
];
const accountNavigation: NavigationItem[] = [
  { name: 'Profil', href: '/profile', icon: User },
  { name: 'Ayarlar', href: '/settings', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const user = useAuthStore(state => state.user);
  const t = useTerms();

  const renderLinks = (items: NavigationItem[]) => items.map(item => (
    <NavLink key={item.href} to={item.href} end={item.href === '/admin'} onClick={onClose}
      className={({ isActive }) => clsx('nav-item', isActive && 'nav-item-active')}>
      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <span>{item.name}</span>
    </NavLink>
  ));

  const content = (
    <div className="flex h-full flex-col bg-[var(--sidebar)]">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b px-5">
        <Link to="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight">
          <Brand />
        </Link>
        <button onClick={onClose} aria-label="Menüyü kapat" className="icon-button ml-auto lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <nav aria-label="Ana gezinme" className="flex-1 overflow-y-auto px-3 py-6">
        <p className="nav-label">Çalışma alanı</p>
        <div className="space-y-1">{renderLinks(navigation(t))}</div>
        {user?.role === 'admin' && <div className="mt-7"><p className="nav-label">Yönetim</p><div className="space-y-1">{renderLinks(adminNavigation(t))}</div></div>}
        <div className="mt-7"><p className="nav-label">Hesap</p><div className="space-y-1">{renderLinks(accountNavigation)}</div></div>
      </nav>
      <div className="mx-3 mb-4 rounded-lg border bg-[var(--surface)] p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Odaklanmaya hazır</div>
        <p className="text-xs leading-5 text-[var(--muted)]">Bir {t.session()}, tek bir odak.</p>
        <Link to="/pomodoro" onClick={onClose} className="mt-3 flex items-center justify-between text-xs font-medium">Odaklanmaya başla<ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-4 text-xs text-[var(--muted)]"><span className="avatar h-7 w-7 text-[10px]">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span><span className="truncate">{user?.fullName}</span></div>
    </div>
  );

  return <>
    <aside className="fixed inset-y-0 left-0 hidden w-[232px] border-r lg:block">{content}</aside>
    <Dialog open={isOpen} onClose={onClose} className="relative z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <Dialog.Panel className="fixed inset-y-0 left-0 w-[min(288px,85vw)] border-r">
        <Dialog.Title className="sr-only">Ana menü</Dialog.Title>
        {content}
      </Dialog.Panel>
    </Dialog>
  </>;
};

export default Sidebar;
