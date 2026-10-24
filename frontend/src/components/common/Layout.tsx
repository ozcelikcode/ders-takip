import { Outlet } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Brand } from './Brand';
import TimezoneNotice from './TimezoneNotice';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useText } from '../../store/languageStore';
import { usePaletteShortcut } from '../../hooks/usePaletteShortcut';

// Loaded on first use so the switcher adds nothing to the first page load.
const CommandPalette = lazy(() => import('./CommandPalette'));

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  usePaletteShortcut(paletteOpen, setPaletteOpen);
  const maintenanceMode = useSettingsStore(state => state.settings.maintenanceMode);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const text = useText().shell;

  if (maintenanceMode && user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--canvas) px-4 text-(--text)">
        <div className="panel w-full max-w-md space-y-4 p-8 text-center" role="status">
          <div className="flex justify-center"><Brand /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{text.maintenanceTitle}</h1>
          <p className="text-sm text-(--muted)">{text.maintenanceHint}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void logout()}>{text.logout}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--canvas) text-(--text)">
      <a className="skip-link" href="#main-content">{text.skipToContent}</a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[232px]">
        <Header onMenuClick={() => setSidebarOpen(true)} onPaletteClick={() => setPaletteOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-4 py-7 outline-hidden sm:px-7 lg:px-10 lg:py-9">
          <TimezoneNotice />
          <Outlet />
        </main>
      </div>
      {paletteOpen && <Suspense fallback={null}><CommandPalette onClose={() => setPaletteOpen(false)} /></Suspense>}
    </div>
  );
};

export default Layout;
