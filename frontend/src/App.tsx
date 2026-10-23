import { applyAppearance } from './lib/appearance';
import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { matchPath, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useUserPreferencesStore } from './store/userPreferencesStore';
import { useLanguageStore } from './store/languageStore';

// Components
import AdminRoute from './components/auth/AdminRoute';
import OnboardingGate from './components/auth/OnboardingGate';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';


// Pages
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const WelcomePage = lazy(() => import('./pages/onboarding/WelcomePage'));

/** A signed-in page inside the shell; `load` lets the shell fetch it before the shell has rendered. */
const shellPage = (path: string, load: () => Promise<{ default: ComponentType }>) => ({ path, load, Page: lazy(load) });
const shellPages = {
  dashboard: shellPage('/dashboard', () => import('./pages/dashboard/DashboardPage')),
  courses: shellPage('/courses', () => import('./pages/CoursesPage')),
  courseDetail: shellPage('/courses/:id', () => import('./pages/CourseDetailPage')),
  planner: shellPage('/planner', () => import('./pages/planner/PlannerPage')),
  stats: shellPage('/stats', () => import('./pages/stats/StatsPage')),
  search: shellPage('/search', () => import('./pages/search/SearchPage')),
  pomodoro: shellPage('/pomodoro', () => import('./pages/pomodoro/PomodoroPage')),
  profile: shellPage('/profile', () => import('./pages/profile/ProfilePage')),
  settings: shellPage('/settings', () => import('./pages/settings/UserSettingsPage')),
};
const { dashboard, courses, courseDetail, planner, stats, search, pomodoro, profile, settings: userSettings } = shellPages;

// The authenticated shell stays out of the public pages' first load. The page at the opened address
// downloads alongside it; otherwise it would only start once the shell has rendered its outlet.
const Layout = lazy(() => {
  const { pathname } = window.location;
  const page = pathname === '/' ? dashboard : Object.values(shellPages).find(({ path }) => matchPath(path, pathname));
  void page?.load().catch(() => undefined);
  return import('./components/common/Layout');
});

function App() {
  const { user, isLoading, initializeAuth } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const preferences = useUserPreferencesStore(state => state.preferences);
  const setLanguage = useLanguageStore(state => state.setLanguage);

  useEffect(() => {
    void initializeAuth();
    fetchSettings();
  }, [initializeAuth, fetchSettings]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void fetchSettings(); };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [fetchSettings]);

  // The administrator's site language applies to everyone, signed in or not.
  useEffect(() => {
    void setLanguage(settings.language).catch(() => undefined);
  }, [settings.language, setLanguage]);

  useEffect(() => {
    const apply = () => applyAppearance(preferences, settings);
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences, settings]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><OnboardingGate><Layout key={user?.id} /></OnboardingGate></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path={dashboard.path} element={<dashboard.Page />} />
        <Route path={courses.path} element={<courses.Page />} />
        <Route path={courseDetail.path} element={<courseDetail.Page />} />
        <Route path={planner.path} element={<planner.Page />} />
        <Route path={stats.path} element={<stats.Page />} />
        <Route path={search.path} element={<search.Page />} />
        <Route path={pomodoro.path} element={<pomodoro.Page />} />
        <Route path={profile.path} element={<profile.Page />} />
        <Route path={userSettings.path} element={<userSettings.Page />} />

        {/* Admin routes */}
        <Route path="admin" element={<AdminRoute />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;