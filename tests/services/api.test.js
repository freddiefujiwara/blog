import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { API_MAX_ATTEMPTS, API_TIMEOUT_MS, buildSearchableArticles, fetchArticle, fetchArticleList, fetchArticleTitles, fetchRSS } from '../../src/services/api';

const fetchOptions = () => expect.objectContaining({ signal: expect.any(AbortSignal) });
import { LIST_ENDPOINT, RSS_ENDPOINT } from '../../src/constants';

describe('api service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchRSS', () => {
    it('fetches RSS XML successfully', async () => {
      const mockXml = '<rss>content</rss>';
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXml)
      });

      const result = await fetchRSS();
      expect(fetch).toHaveBeenCalledWith(RSS_ENDPOINT, fetchOptions());
      expect(result).toBe(mockXml);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(fetchRSS()).rejects.toThrow('RSSの取得に失敗しました。');
    });
  });

  describe('fetchArticle', () => {
    it('fetches an article successfully', async () => {
      const mockArticle = { id: '1', title: 'Test', markdown: 'Content' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockArticle)
      });

      const result = await fetchArticle('1');
      expect(fetch).toHaveBeenCalledWith(`${LIST_ENDPOINT}?id=1`, fetchOptions());
      expect(result).toEqual(mockArticle);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(fetchArticle('1')).rejects.toThrow('記事の取得に失敗しました。');
    });
  });

  describe('fetchArticleList', () => {
    it('fetches article list successfully', async () => {
      const mockResponse = {
        ids: ['1', '2'],
        article_cache: [{ id: '1', title: 'T1', markdown: 'M1' }]
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fetchArticleList();
      expect(fetch).toHaveBeenCalledWith(LIST_ENDPOINT, fetchOptions());
      expect(result).toEqual(mockResponse);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(fetchArticleList()).rejects.toThrow('記事一覧の取得に失敗しました。');
    });

    it('throws error when ids is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ids: [], article_cache: [] })
      });

      await expect(fetchArticleList()).rejects.toThrow('最新記事が見つかりませんでした。');
    });

    it('throws error when data is null', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null)
      });

      await expect(fetchArticleList()).rejects.toThrow('最新記事が見つかりませんでした。');
    });
  });

  describe('fetchArticleTitles', () => {
    it('fetches the lightweight titles endpoint', async () => {
      const mockResponse = {
        ids: ['1', '2'],
        titles: { 1: 'T1', 2: 'T2' }
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fetchArticleTitles();
      expect(fetch).toHaveBeenCalledWith(`${LIST_ENDPOINT}?o=titles`, fetchOptions());
      expect(result).toEqual(mockResponse);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      });

      await expect(fetchArticleTitles()).rejects.toThrow('記事タイトル一覧の取得に失敗しました。');
    });

    it('throws error when ids is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ids: [], titles: {} })
      });

      await expect(fetchArticleTitles()).rejects.toThrow('最新記事が見つかりませんでした。');
    });
  });

  describe('apiFetch retries', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries after a network error and succeeds', async () => {
      vi.useFakeTimers();
      const mockArticle = { id: '1', title: 'Test', markdown: 'Content' };
      fetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockArticle) });

      const promise = fetchArticle('1');
      await vi.advanceTimersByTimeAsync(600);
      await expect(promise).resolves.toEqual(mockArticle);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries on a 5xx response and succeeds', async () => {
      vi.useFakeTimers();
      const mockArticle = { id: '1', title: 'Test', markdown: 'Content' };
      fetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockArticle) });

      const promise = fetchArticle('1');
      await vi.advanceTimersByTimeAsync(600);
      await expect(promise).resolves.toEqual(mockArticle);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry a 4xx response', async () => {
      fetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(fetchArticle('1')).rejects.toThrow('記事の取得に失敗しました。');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('gives up after the maximum attempts on persistent network errors', async () => {
      vi.useFakeTimers();
      fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const promise = fetchArticle('1');
      const expectation = expect(promise).rejects.toThrow('Failed to fetch');
      await vi.advanceTimersByTimeAsync(600 + 1500);
      await expectation;
      expect(fetch).toHaveBeenCalledTimes(API_MAX_ATTEMPTS);
    });

    it('aborts a stalled request at the timeout and retries', async () => {
      vi.useFakeTimers();
      const mockArticle = { id: '1', title: 'Test', markdown: 'Content' };
      fetch
        .mockImplementationOnce((url, options) => new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockArticle) });

      const promise = fetchArticle('1');
      await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 600);
      await expect(promise).resolves.toEqual(mockArticle);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildSearchableArticles', () => {
    it('maps ids to titles in list order', () => {
      const data = {
        ids: ['1', '2'],
        titles: { 1: 'Title 1', 2: 'Title 2' },
        article_cache: []
      };
      expect(buildSearchableArticles(data)).toEqual([
        { id: '1', title: 'Title 1' },
        { id: '2', title: 'Title 2' }
      ]);
    });

    it('falls back to article_cache titles when the titles map is missing', () => {
      const data = {
        ids: ['1', '2'],
        article_cache: [{ id: '1', title: 'Cached 1', markdown: 'x' }]
      };
      expect(buildSearchableArticles(data)).toEqual([{ id: '1', title: 'Cached 1' }]);
    });

    it('returns an empty list for unusable input', () => {
      expect(buildSearchableArticles(null)).toEqual([]);
      expect(buildSearchableArticles({})).toEqual([]);
      expect(buildSearchableArticles({ ids: 'nope' })).toEqual([]);
    });
  });
});
