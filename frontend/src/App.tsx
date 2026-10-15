import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useUserPreferencesStore } from './store/userPreferencesStore';

// Components
import AdminRoute from './components/auth/AdminRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/common/Layout';
import LoadingScreen from './components/common/LoadingScreen';


// Pages
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const PlannerPage = lazy(() => import('./pages/planner/PlannerPage'));
const PomodoroPage = lazy(() => import('./pages/pomodoro/PomodoroPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const UserSettingsPage = lazy(() => import('./pages/settings/UserSettingsPage'));


function App() {
  const { user, isLoading, initializeAuth } = useAuthStore();
  const { fetchSettings, applyTheme } = useSettingsStore();
  const { applyTheme: applyUserTheme, syncWithServer } = useUserPreferencesStore();

  useEffect(() => {
    void initializeAuth();
    fetchSettings();
  }, [initializeAuth, fetchSettings]);

  // Apply theme on mount and when settings change
  useEffect(() => {
    applyTheme();
    applyUserTheme();
  }, [applyTheme, applyUserTheme]);

  // Sync user preferences when user data is loaded
  useEffect(() => {
    if (user?.preferences) {
      syncWithServer(user.preferences);
    }
  }, [user?.id, syncWithServer]); // Only sync when user ID changes (login/init) or sync function changes

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="planner" element={<PlannerPage />} />
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