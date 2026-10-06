import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { useAuth } from '../context/AuthContext';
import { friendlyCognitoError, isCognitoConfigured } from '../services/cognito';

export default function UserLogin() {
  const { isUserAuthenticated, loading: authLoading, login } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/user/dashboard';

  const [username, setUsername] = useState(location.state?.username || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notice = location.state?.notice;

  const { isAuthenticated: isAdminAuthenticated } = useAuth();
  
  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!authLoading && isUserAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err?.code === 'UserNotConfirmedException') {
        navigate('/user/register', { state: { confirmUsername: username.trim() } });
        return;
      }
      setError(err?.response ? 'Signed in, but your profile could not be loaded. Please try again.' : friendlyCognitoError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="login-card auth-card">
          <div className="auth-icon">👤</div>
          <h1>User Login</h1>
          <p className="login-subtitle">Sign in to report incidents and track your reports</p>

          {!isCognitoConfigured() && (
            <div className="alert alert-error"><span>⚠️</span><span>User sign-in is not configured.</span></div>
          )}
          {notice && <div className="alert alert-success"><span>✅</span><span>{notice}</span></div>}
          {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="user-login-username">Username</label>
              <input
                id="user-login-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="user-login-password">Password</label>
              <input
                id="user-login-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              id="user-login-submit"
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Signing In...' : '🔑 Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/user/register" id="go-to-register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
