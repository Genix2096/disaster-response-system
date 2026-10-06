import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Guards normal-user pages. Unauthenticated visitors are redirected to
 * /user/login and returned to the original page after signing in.
 */
export default function ProtectedUserRoute({ children }) {
  const { isUserAuthenticated, loading } = useUserAuth();
  const { isAuthenticated: isAdminAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-container"><LoadingSpinner /></div>;
  }

  // Bouncer for admins trying to access normal user routes
  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!isUserAuthenticated) {
    return <Navigate to="/user/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
