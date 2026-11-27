import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthRequiredError,
  clearSessionToken,
  exchangeSession,
  getSessionToken,
  storeSessionToken,
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
