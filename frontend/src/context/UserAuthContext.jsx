import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendConfirmationCode,
  getCurrentSession,
  sessionToUser,
} from '../services/cognito';
import { getMyProfile } from '../services/api';

/**
 * Normal-user (Cognito) auth state.
 * Deliberately separate from the admin AuthContext — the two never share tokens.
 */
const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, email } — display only
  const [loading, setLoading] = useState(true);

  // Restore an existing Cognito session on page load.
  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((session) => {
      if (!cancelled) {
        setUser(sessionToUser(session));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username, password) => {
    const session = await signIn(username, password);
    setUser(sessionToUser(session));
    // Provision / fetch the DisasterUsers profile from the verified token.
    await getMyProfile();
    return session;
  }, []);

  const logout = useCallback(() => {
    signOut();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isUserAuthenticated: !!user,
    login,
    logout,
    register: signUp,
    confirmRegistration: confirmSignUp,
    resendCode: resendConfirmationCode,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within UserAuthProvider');
  }
  return context;
}
