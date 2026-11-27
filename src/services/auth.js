import { GOOGLE_OAUTH_CLIENT_ID, LIST_ENDPOINT } from '../constants';
import { isStagingBuild } from '../staging-banner';
import { t } from './i18n';

// Staging-only sign-in. The staging blog-gas requires a session
// token (exchanged from a Google ID token, the same scheme as the
// other apps); production builds never call any of this — the gate
// in App.vue and the token attachment in api.js both switch on
// isStagingBuild().

export class AuthRequiredError extends Error {
  constructor(message = t('signInRequired')) {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

const SESSION_STORAGE_KEY = 'blog:session:v1:staging';

export const getSessionToken = () => {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const storeSessionToken = (token) => {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    // A session that cannot be stored just means signing in again
    // on the next visit; nothing else depends on it.
  }
};

export const clearSessionToken = () => {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

// Attaches the stored session token to blog-gas URLs. Every other
// URL (the music endpoints, the top site's JSON) passes through
// untouched, as does everything in production builds.
export const withSessionToken = (url) => {
  if (!isStagingBuild() || typeof url !== 'string' || !url.startsWith(LIST_ENDPOINT)) {
    return url;
  }
  const token = getSessionToken();
  if (!token) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}session_token=${encodeURIComponent(token)}`;
};

// Exchanges a Google ID token (from the sign-in button) for the
// 30-day session token blog-gas issues, and stores it.
export const exchangeSession = async (idToken) => {
  const response = await fetch(
    `${LIST_ENDPOINT}?action=exchange_session&id_token=${encodeURIComponent(idToken)}`
  );
  const data = await response.json();
  if (!data?.session_token) {
    throw new AuthRequiredError(t('signInFailed'));
  }
  storeSessionToken(data.session_token);
  return data.session_token;
};

const loadGoogleSignIn = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Sign-In failed to load'));
    document.head.appendChild(script);
  });

// Renders Google's own sign-in button into the element; the
// credential callback receives the ID token to exchange.
export const renderGoogleSignInButton = async (element, onCredential) => {
  await loadGoogleSignIn();
  window.google.accounts.id.initialize({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  });
  window.google.accounts.id.renderButton(element, { theme: 'outline', size: 'large' });
};
