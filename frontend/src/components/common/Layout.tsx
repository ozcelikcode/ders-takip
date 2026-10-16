import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Brand } from './Brand';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const maintenanceMode = useSettingsStore(state => state.settings.maintenanceMode);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  if (maintenanceMode && user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4 text-[var(--text)]">
        <div className="panel w-full max-w-md space-y-4 p-8 text-center" role="status">
          <div className="flex justify-center"><Brand /></div>
          <h1 className="text-2xl font-semibold tracking-tight">Site bakımda</h1>
          <p className="text-sm text-[var(--muted)]">Kısa süre içinde tekrar hizmetinizde olacağız. Lütfen daha sonra tekrar deneyin.</p>
          <button type="button" className="btn btn-secondary" onClick={() => void logout()}>Çıkış yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <a className="skip-link" href="#main-content">İçeriğe geç</a>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[232px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-4 py-7 outline-none sm:px-7 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
