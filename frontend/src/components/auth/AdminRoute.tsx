import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useText } from '../../store/languageStore';

const AdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const loading = useText().common.loading;

  if (isLoading) {
    return <div role="status">{loading}</div>;
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;