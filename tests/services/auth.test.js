import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthRequiredError,
  canIssueShareLink,
  captureShareTokenFromUrl,
  clearSessionToken,
  clearShareToken,
  exchangeSession,
  getSessionToken,
  getShareToken,
  issueShareLink,
  storeSessionToken,
  storeShareToken,
  withSessionToken
} from '../../src/services/auth';
import { LIST_ENDPOINT, MUSIC_ENDPOINT } from '../../src/constants';
import { isStagingBuild } from '../../src/staging-banner.js';

vi.mock('../../src/staging-banner.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isStagingBuild: vi.fn(actual.isStagingBuild)
  };
});

describe('auth service (staging sign-in)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(isStagingBuild).mockReset();
    vi.mocked(isStagingBuild).mockImplementation(() => false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores, reads and clears the session token', () => {
    expect(getSessionToken()).toBe('');
    storeSessionToken('tok123');
    expect(getSessionToken()).toBe('tok123');
    clearSessionToken();
    expect(getSessionToken()).toBe('');
  });

  it('leaves every URL untouched in production builds', () => {
    storeSessionToken('tok123');
    expect(withSessionToken(`${LIST_ENDPOINT}?id=1`)).toBe(`${LIST_ENDPOINT}?id=1`);
  });

  it('attaches the session token to blog-gas URLs in staging builds', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    storeSessionToken('tok123');
    expect(withSessionToken(`${LIST_ENDPOINT}?id=1`)).toBe(
      `${LIST_ENDPOINT}?id=1&session_token=tok123`
    );
    expect(withSessionToken(LIST_ENDPOINT)).toBe(`${LIST_ENDPOINT}?session_token=tok123`);
  });

  it('does not attach the token to other endpoints or without a session', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    storeSessionToken('tok123');
    expect(withSessionToken(MUSIC_ENDPOINT)).toBe(MUSIC_ENDPOINT);
    clearSessionToken();
    expect(withSessionToken(`${LIST_ENDPOINT}?id=1`)).toBe(`${LIST_ENDPOINT}?id=1`);
  });

  it('exchanges an ID token for a stored session token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ session_token: 'sess1', email: 'zegenvs@gmail.com' })
      })
    );
    const token = await exchangeSession('idtok');
    expect(token).toBe('sess1');
    expect(getSessionToken()).toBe('sess1');
    expect(fetch).toHaveBeenCalledWith(
      `${LIST_ENDPOINT}?action=exchange_session&id_token=idtok`
    );
  });

  it('stores, reads and clears the share token', () => {
    expect(getShareToken()).toBe('');
    storeShareToken('share1');
    expect(getShareToken()).toBe('share1');
    clearShareToken();
    expect(getShareToken()).toBe('');
  });

  it('attaches the share token when there is no session, and prefers the session', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    storeShareToken('share1');
    expect(withSessionToken(`${LIST_ENDPOINT}?id=1`)).toBe(
      `${LIST_ENDPOINT}?id=1&share_token=share1`
    );
    storeSessionToken('tok123');
    expect(withSessionToken(`${LIST_ENDPOINT}?id=1`)).toBe(
      `${LIST_ENDPOINT}?id=1&session_token=tok123`
    );
  });

  it('captures a #share= token from the URL and strips it from the address bar', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    window.history.replaceState(null, '', '/blog/staging/#share=share1');
    expect(captureShareTokenFromUrl()).toBe('share1');
    expect(getShareToken()).toBe('share1');
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/blog/staging/');
  });

  it('captures nothing without a share fragment or in production builds', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    window.history.replaceState(null, '', '/blog/staging/');
    expect(captureShareTokenFromUrl()).toBe('');
    window.history.replaceState(null, '', '/blog/staging/#share=share1');
    vi.mocked(isStagingBuild).mockImplementation(() => false);
    expect(captureShareTokenFromUrl()).toBe('');
    expect(getShareToken()).toBe('');
    window.history.replaceState(null, '', '/blog/staging/');
  });

  it('offers the share-link issuer only on staging with a session', () => {
    expect(canIssueShareLink()).toBe(false);
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    expect(canIssueShareLink()).toBe(false);
    storeSessionToken('sess1');
    expect(canIssueShareLink()).toBe(true);
  });

  it('issues a share link with the stored session', async () => {
    storeSessionToken('sess1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ share_token: 'share1', expires_at: 1234567890 })
      })
    );
    const issued = await issueShareLink();
    expect(issued.token).toBe('share1');
    expect(issued.expiresAt).toBe(1234567890);
    expect(issued.url).toContain('#share=share1');
    expect(fetch).toHaveBeenCalledWith(
      `${LIST_ENDPOINT}?action=issue_share&session_token=sess1`
    );
  });

  it('cannot issue a share link without a session or when the backend refuses', async () => {
    await expect(issueShareLink()).rejects.toBeInstanceOf(AuthRequiredError);
    storeSessionToken('sess1');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: 'unauthorized' })
      })
    );
    await expect(issueShareLink()).rejects.toThrow();
    expect(getShareToken()).toBe('');
  });

  it('fails the exchange when the backend refuses the ID token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ error: 'unauthorized' })
      })
    );
    await expect(exchangeSession('bad')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(getSessionToken()).toBe('');
  });
});
