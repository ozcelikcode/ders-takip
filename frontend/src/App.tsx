import { applyAppearance } from './lib/appearance';
import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useUserPreferencesStore } from './store/userPreferencesStore';

// Components
import AdminRoute from './components/auth/AdminRoute';
import OnboardingGate from './components/auth/OnboardingGate';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';


// Pages
// The authenticated shell stays out of the public pages' first load.
const Layout = lazy(() => import('./components/common/Layout'));
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const PlannerPage = lazy(() => import('./pages/planner/PlannerPage'));
const StatsPage = lazy(() => import('./pages/stats/StatsPage'));
const SearchPage = lazy(() => import('./pages/search/SearchPage'));
const PomodoroPage = lazy(() => import('./pages/pomodoro/PomodoroPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const UserSettingsPage = lazy(() => import('./pages/settings/UserSettingsPage'));
const WelcomePage = lazy(() => import('./pages/onboarding/WelcomePage'));

function App() {
  const { user, isLoading, initializeAuth } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const preferences = useUserPreferencesStore(state => state.preferences);

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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="pomodoro" element={<PomodoroPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<UserSettingsPage />} />

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