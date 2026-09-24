import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="logo-icon">🚨</span>
        <span>Disaster Response System</span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>
          Report Incident
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/admin/dashboard" className={isActive('/admin/dashboard')}>
              Dashboard
            </Link>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/admin/login" className={isActive('/admin/login')}>
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
