import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageSkeleton from './ui/PageSkeleton';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton variant="dashboard" fullScreen />;

  if (!user) {
    // Store the intended destination so we can redirect back after login
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (user.mustChangePassword && window.location.pathname !== '/profile') {
    return <Navigate to="/profile?force=1" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
