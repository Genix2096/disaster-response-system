import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { friendlyCognitoError, isCognitoConfigured } from '../services/cognito';

const USERNAME_RE = /^[A-Za-z0-9._-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ username, email, password, confirmPassword }) {
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3–64 characters: letters, numbers, dot, underscore or hyphen.';
  }
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include uppercase, lowercase letters and a number.';
  }
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}

export default function UserRegister() {
  const { isUserAuthenticated, loading: authLoading, register, confirmRegistration, resendCode, login } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If arriving from login with an unconfirmed account, jump straight to the code step.
  const resumeUsername = location.state?.confirmUsername || '';

  const [step, setStep] = useState(resumeUsername ? 'confirm' : 'register');
  const [form, setForm] = useState({ username: resumeUsername, email: '', password: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(resumeUsername ? 'Enter the verification code sent to your email.' : '');
  const [loading, setLoading] = useState(false);

  if (!authLoading && isUserAuthenticated) {
    return <Navigate to="/user/dashboard" replace />;
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Sign in right after registration so the DisasterUsers profile is provisioned.
  async function finishWithLogin() {
    if (form.password) {
      try {
        await login(form.username.trim(), form.password);
        navigate('/user/dashboard', { replace: true });
        return;
      } catch {
        // fall through to manual login
      }
    }
    navigate('/user/login', {
      replace: true,
      state: { username: form.username.trim(), notice: 'Account confirmed. Please sign in.' },
    });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, username: form.username.trim(), email: form.email.trim() };
    const validationError = validate(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await register({ username: payload.username, email: payload.email, password: payload.password });
      if (result.userConfirmed) {
        await finishWithLogin();
      } else {
        setDestination(result.destination || payload.email);
        setInfo('');
        setStep('confirm');
      }
    } catch (err) {
      setError(friendlyCognitoError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError('Please enter the numeric verification code from your email.');
      return;
    }
    setLoading(true);
    try {
      await confirmRegistration(form.username.trim(), code.trim());
      await finishWithLogin();
    } catch (err) {
      setError(friendlyCognitoError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    try {
      await resendCode(form.username.trim());
      setInfo('A new verification code has been sent.');
    } catch (err) {
      setError(friendlyCognitoError(err));
    }
  }

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="login-card auth-card">
          <div className="auth-icon">{step === 'register' ? '📝' : '📧'}</div>
          <h1>{step === 'register' ? 'Create Account' : 'Verify Your Email'}</h1>
          <p className="login-subtitle">
            {step === 'register'
              ? 'Register to report incidents and track their progress'
              : `We sent a verification code to ${destination || 'your email'}.`}
          </p>

          {!isCognitoConfigured() && (
            <div className="alert alert-error"><span>⚠️</span><span>User registration is not configured.</span></div>
          )}
          {info && <div className="alert alert-info"><span>ℹ️</span><span>{info}</span></div>}
          {error && <div className="alert alert-error"><span>⚠️</span><span>{error}</span></div>}

          {step === 'register' ? (
            <form onSubmit={handleRegister} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="register-username">Username</label>
                <input id="register-username" name="username" type="text" className="form-input"
                  value={form.username} onChange={handleChange} placeholder="Choose a username"
                  autoComplete="username" maxLength={64} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email</label>
                <input id="register-email" name="email" type="email" className="form-input"
                  value={form.email} onChange={handleChange} placeholder="you@example.com"
                  autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Password</label>
                <input id="register-password" name="password" type="password" className="form-input"
                  value={form.password} onChange={handleChange} placeholder="At least 8 characters"
                  autoComplete="new-password" />
                <div className="form-hint">Use uppercase, lowercase, a number and a symbol.</div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-confirm-password">Confirm Password</label>
                <input id="register-confirm-password" name="confirmPassword" type="password" className="form-input"
                  value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter password"
                  autoComplete="new-password" />
              </div>
              <button id="register-submit" type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating Account...' : '🚀 Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-username">Username</label>
                <input id="confirm-username" name="username" type="text" className="form-input"
                  value={form.username} onChange={handleChange} disabled={!!form.password} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-code">Verification Code</label>
                <input id="confirm-code" type="text" inputMode="numeric" className="form-input"
                  value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code"
                  autoComplete="one-time-code" maxLength={8} />
              </div>
              <button id="confirm-submit" type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Verifying...' : '✅ Verify & Continue'}
              </button>
              <button id="resend-code" type="button" className="btn btn-outline btn-block" onClick={handleResend}
                style={{ marginTop: '0.5rem' }}>
                Resend Code
              </button>
            </form>
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/user/login" id="go-to-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
