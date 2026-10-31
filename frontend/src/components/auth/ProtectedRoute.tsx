import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // App shows the loading screen until the session is known, so only the signed-in state matters here.
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // An expired session or a signed-out visit returns here after sign-in; a deliberate sign-out does not.
  const signedOut = useAuthStore((state) => state.signedOut);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={signedOut ? undefined : { from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;