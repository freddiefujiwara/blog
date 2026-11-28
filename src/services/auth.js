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

// Magic-link access: a staging URL may carry the project's share
// token as #share=<token> (the same scheme as the other apps'
// share links). Opening such a link stores the token here, and
// reads then carry it instead of a session — no sign-in needed on
// that browser until the token is replaced server-side.
const SHARE_STORAGE_KEY = 'blog:share:v1:staging';

export const getShareToken = () => {
  try {
    return window.localStorage.getItem(SHARE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const storeShareToken = (token) => {
  try {
    window.localStorage.setItem(SHARE_STORAGE_KEY, token);
  } catch {
    // An unstored share token just means opening the link again.
  }
};

export const clearShareToken = () => {
  try {
    window.localStorage.removeItem(SHARE_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

// Picks a #share=<token> off the current URL, stores it, and
// removes it from the address bar so the credential does not sit
// in the history entry for this page. Returns the captured token
// ('' when the URL carried none). Staging builds only.
export const captureShareTokenFromUrl = () => {
  if (!isStagingBuild()) {
    return '';
  }
  try {
    const match = /(?:^#|[#&])share=([^&]+)/.exec(window.location.hash || '');
    if (!match) {
      return '';
    }
    const token = decodeURIComponent(match[1]);
    storeShareToken(token);
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', cleanUrl);
    return token;
  } catch {
    return '';
  }
};

// Attaches the stored credential to blog-gas URLs: the session
// token when signed in, otherwise the share token from a magic
// link. Every other URL (the music endpoints, the top site's
// JSON) passes through untouched, as does everything in
// production builds.
export const withSessionToken = (url) => {
  if (!isStagingBuild() || typeof url !== 'string' || !url.startsWith(LIST_ENDPOINT)) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  const token = getSessionToken();
  if (token) {
    return `${url}${separator}session_token=${encodeURIComponent(token)}`;
  }
  const share = getShareToken();
  if (share) {
    return `${url}${separator}share_token=${encodeURIComponent(share)}`;
  }
  return url;
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
