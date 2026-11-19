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
      titles: { 1: 'Title 1', 2: 'Title 2' },
      article_cache: [{ id: '1', title: 'Title 1', markdown: 'Content 1' }]
    };
    saveCachedList(data);
    expect(loadCachedList()).toEqual(data);
  });

  it('defaults titles to an empty map for lists saved before titles existed', () => {
    saveCachedList({ ids: ['1'], article_cache: [] });
    expect(loadCachedList().titles).toEqual({});
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({ ids: ['1'], article_cache: [] })
    );
    expect(loadCachedList().titles).toEqual({});
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
    expect(loadCachedList()).toEqual({ ids: ['1'], titles: {}, article_cache: [] });

    saveCachedList({ ids: ['2'] });
    expect(loadCachedList()).toEqual({ ids: ['2'], titles: {}, article_cache: [] });
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

  it('round-trips the tags map together with titles', () => {
    const data = {
      ids: ['1', '2'],
      titles: { 1: 'Title 1', 2: 'Title 2' },
      tags: { 1: ['運営', '技術'], 2: ['中国語'] },
      article_cache: []
    };
    saveCachedList(data);
    expect(loadCachedList()).toEqual(data);
  });

  it('keeps the tags key absent for lists saved before tags existed', () => {
    saveCachedList({ ids: ['1'], titles: { 1: 'T' }, article_cache: [] });
    expect(loadCachedList()).not.toHaveProperty('tags');
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({ ids: ['1'], titles: { 1: 'T' }, article_cache: [] })
    );
    expect(loadCachedList()).not.toHaveProperty('tags');
  });

  it('drops malformed tags entries when saving and loading', () => {
    saveCachedList({
      ids: ['1', '2'],
      tags: { 1: ['運営'], 2: '技術' },
      article_cache: []
    });
    expect(loadCachedList().tags).toEqual({ 1: ['運営'] });
  });

  it('keeps each language\'s list under its own key', () => {
    const ja = { ids: ['1'], titles: { 1: 'タイトル' }, article_cache: [] };
    const en = { ids: ['1'], titles: { 1: 'Title EN' }, article_cache: [] };
    const zh = { ids: ['1'], titles: { 1: '标题' }, article_cache: [] };
    saveCachedList(ja);
    saveCachedList(en, 'en');
    saveCachedList(zh, 'zh');

    // The Japanese list stays under the original key, untouched by
    // the translated saves.
    expect(JSON.parse(localStorage.getItem('blog:list-cache:v1')).titles).toEqual({ 1: 'タイトル' });
    expect(localStorage.getItem('blog:list-cache:v1:en')).not.toBeNull();
    expect(localStorage.getItem('blog:list-cache:v1:zh')).not.toBeNull();
    expect(loadCachedList()).toEqual(ja);
    expect(loadCachedList('ja')).toEqual(ja);
    expect(loadCachedList('en')).toEqual(en);
    expect(loadCachedList('zh')).toEqual(zh);
  });

  it('returns null for a language with nothing stored, even when another language has a list', () => {
    saveCachedList({ ids: ['1'], titles: { 1: 'Title EN' }, article_cache: [] }, 'en');
    expect(loadCachedList('en')).not.toBeNull();
    expect(loadCachedList()).toBeNull();
    expect(loadCachedList('zh')).toBeNull();
  });

  it('never saves or loads the cache in staging builds', async () => {
    vi.stubEnv('VITE_STAGING', '1');
    vi.resetModules();
    try {
      const stagingCache = await import('../../src/services/listCache');
      stagingCache.saveCachedList({ ids: ['9'], article_cache: [] });
      expect(localStorage.getItem('blog:list-cache:v1')).toBeNull();
      expect(localStorage.getItem('blog:list-cache:v1:staging')).toBeNull();
      // Even a list stored by an older staging build is ignored, so a
      // preview can never render stale articles.
      localStorage.setItem(
        'blog:list-cache:v1:staging',
        JSON.stringify({ ids: ['9'], article_cache: [] })
      );
      expect(stagingCache.loadCachedList()).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
