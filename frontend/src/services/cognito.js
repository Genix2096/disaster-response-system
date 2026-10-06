/**
 * Lightweight Cognito client for NORMAL USERS (SPA, no client secret).
 *
 * Uses amazon-cognito-identity-js (SRP auth — the password is never sent to
 * Cognito in plain form and never reaches our backend). Session tokens are
 * kept by the library in localStorage and refreshed automatically via the
 * refresh token. No AWS credentials are used or stored in the browser.
 *
 * Admin authentication is separate and does NOT use this module.
 */
import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

let userPool = null;

export function isCognitoConfigured() {
  return Boolean(USER_POOL_ID && CLIENT_ID);
}

function getUserPool() {
  if (!isCognitoConfigured()) {
    throw new Error('Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.');
  }
  if (!userPool) {
    userPool = new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });
  }
  return userPool;
}

function cognitoUser(username) {
  return new CognitoUser({ Username: username, Pool: getUserPool() });
}

/**
 * Map Cognito errors to safe, user-friendly messages.
 * Avoids leaking whether an account exists on login.
 */
export function friendlyCognitoError(err) {
  switch (err?.code || err?.name) {
    case 'UsernameExistsException':
      return 'That username is already taken. Please choose another.';
    case 'InvalidPasswordException':
      // Cognito's policy message is safe and helpful ("must have uppercase...").
      return err.message?.replace(/^Password did not conform with policy: /, 'Password policy: ')
        || 'Password does not meet the requirements.';
    case 'InvalidParameterException':
      return 'Some of the details entered are invalid. Please check and try again.';
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'Incorrect username or password.';
    case 'UserNotConfirmedException':
      return 'Your account is not confirmed yet. Please enter the verification code sent to your email.';
    case 'CodeMismatchException':
      return 'Invalid verification code. Please try again.';
    case 'ExpiredCodeException':
      return 'This verification code has expired. Please request a new one.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** Register a new user (username + email + password). */
export function signUp({ username, email, password }) {
  return new Promise((resolve, reject) => {
    const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
    getUserPool().signUp(username, password, attributes, null, (err, result) => {
      if (err) return reject(err);
      resolve({
        userConfirmed: result.userConfirmed,
        userSub: result.userSub,
        destination: result.codeDeliveryDetails?.Destination,
      });
    });
  });
}

/** Confirm registration with the emailed verification code. */
export function confirmSignUp(username, code) {
  return new Promise((resolve, reject) => {
    cognitoUser(username).confirmRegistration(code, true, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export function resendConfirmationCode(username) {
  return new Promise((resolve, reject) => {
    cognitoUser(username).resendConfirmationCode((err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/** Sign in with username + password (SRP). Resolves with a CognitoUserSession. */
export function signIn(username, password) {
  return new Promise((resolve, reject) => {
    const user = cognitoUser(username);
    const details = new AuthenticationDetails({ Username: username, Password: password });
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      newPasswordRequired: () => {
        const e = new Error('A new password is required for this account.');
        e.code = 'NewPasswordRequired';
        reject(e);
      },
    });
  });
}

/** Clear the local Cognito session. */
export function signOut() {
  if (!isCognitoConfigured()) return;
  const user = getUserPool().getCurrentUser();
  if (user) user.signOut();
}

/**
 * Get the current valid session (auto-refreshes expired tokens).
 * Resolves null if not signed in or the session cannot be refreshed.
 */
export function getCurrentSession() {
  return new Promise((resolve) => {
    if (!isCognitoConfigured()) return resolve(null);
    const user = getUserPool().getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err, session) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

/** Current Cognito ID token (JWT) for `Authorization: Bearer`, or null. */
export async function getIdToken() {
  const session = await getCurrentSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

/** Basic display info from the current session (display only — never trusted by the backend). */
export function sessionToUser(session) {
  if (!session) return null;
  const payload = session.getIdToken().decodePayload();
  return {
    username: payload['cognito:username'],
    email: payload.email,
  };
}
