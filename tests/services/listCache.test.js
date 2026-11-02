import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCachedList, saveCachedList } from '../../src/services/listCache';

describe('listCache service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when nothing is stored', () => {
    expect(loadCachedList()).toBeNull();
  });

  it('round-trips a saved list', () => {
    const data = {
      ids: ['1', '2'],
      article_cache: [{ id: '1', title: 'Title 1', markdown: 'Content 1' }]
    };
    saveCachedList(data);
    expect(loadCachedList()).toEqual(data);
  });

  it('returns null for corrupt JSON', () => {
    localStorage.setItem('blog:list-cache:v1', 'not-json');
    expect(loadCachedList()).toBeNull();
  });

  it('returns null when ids are missing or empty', () => {
    localStorage.setItem('blog:list-cache:v1', JSON.stringify({ ids: [] }));
    expect(loadCachedList()).toBeNull();
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({ article_cache: [] })
    );
    expect(loadCachedList()).toBeNull();
  });

  it('defaults article_cache to an empty array', () => {
    localStorage.setItem('blog:list-cache:v1', JSON.stringify({ ids: ['1'] }));
    expect(loadCachedList()).toEqual({ ids: ['1'], article_cache: [] });

    saveCachedList({ ids: ['2'] });
    expect(loadCachedList()).toEqual({ ids: ['2'], article_cache: [] });
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => saveCachedList({ ids: ['1'] })).not.toThrow();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(loadCachedList()).toBeNull();
  });
});
