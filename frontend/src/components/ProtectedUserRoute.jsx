import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Guards normal-user pages. Unauthenticated visitors are redirected to
 * /user/login and returned to the original page after signing in.
 */
export default function ProtectedUserRoute({ children }) {
  const { isUserAuthenticated, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-container"><LoadingSpinner /></div>;
  }

  if (!isUserAuthenticated) {
    return <Navigate to="/user/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
