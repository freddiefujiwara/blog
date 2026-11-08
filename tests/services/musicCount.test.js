import { describe, it, expect, vi } from 'vitest';
import {
  MUSIC_COUNT_URL,
  fetchMusicPlayCount,
  formatMusicPlayCount,
} from '../../src/services/musicCount';

describe('musicCount service', () => {
  it('fetches the top-site JSON and returns the count', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(url).toBe(MUSIC_COUNT_URL);
      return { ok: true, json: async () => ({ count: 85, updated_at: 't' }) };
    });
    await expect(fetchMusicPlayCount(fetchImpl)).resolves.toBe(85);
  });

  it('returns null when the file does not exist yet', async () => {
    const fetchImpl = async () => ({ ok: false, json: async () => ({}) });
    await expect(fetchMusicPlayCount(fetchImpl)).resolves.toBeNull();
  });

  it('returns null for a malformed payload', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ ids: ['x'] }),
    });
    await expect(fetchMusicPlayCount(fetchImpl)).resolves.toBeNull();
  });

  it('returns null when the response has no json body', async () => {
    const fetchImpl = async () => undefined;
    await expect(fetchMusicPlayCount(fetchImpl)).resolves.toBeNull();
  });

  it('returns null on a network error instead of throwing', async () => {
    const fetchImpl = async () => {
      throw new Error('network');
    };
    await expect(fetchMusicPlayCount(fetchImpl)).resolves.toBeNull();
  });

  it('formats the count with a thousands separator', () => {
    expect(formatMusicPlayCount(85)).toBe('85回再生');
    expect(formatMusicPlayCount(1234)).toBe('1,234回再生');
  });
});
