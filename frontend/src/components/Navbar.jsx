import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserAuth } from '../context/UserAuthContext';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth(); // admin (unchanged)
  const { isUserAuthenticated, user, logout: userLogout } = useUserAuth(); // normal user (Cognito)
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const onAdminPage = location.pathname.startsWith('/admin');

  function handleUserLogout() {
    userLogout();
    navigate('/user/login');
  }

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

        {/* Normal user section */}
        {isUserAuthenticated ? (
          <>
            <Link id="nav-user-dashboard" to="/user/dashboard" className={isActive('/user/dashboard')}>
              My Dashboard
            </Link>
            <button id="nav-user-logout" onClick={handleUserLogout} title={user?.username}>
              Logout{user?.username ? ` (${user.username})` : ''}
            </button>
          </>
        ) : (
          !onAdminPage && (
            <>
              <Link id="nav-user-login" to="/user/login" className={isActive('/user/login')}>
                Login
              </Link>
              <Link id="nav-user-register" to="/user/register" className={isActive('/user/register')}>
                Sign Up
              </Link>
            </>
          )
        )}

        <span className="navbar-divider" aria-hidden="true" />

        {/* Admin section (existing behaviour) */}
        {isAuthenticated ? (
          <>
            <Link to="/admin/dashboard" className={isActive('/admin/dashboard')}>
              Admin Dashboard
            </Link>
            <button onClick={logout}>Admin Logout</button>
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
