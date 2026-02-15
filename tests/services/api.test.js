import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchArticle, fetchArticleList, fetchRSS } from '../../src/services/api';
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
      expect(fetch).toHaveBeenCalledWith(RSS_ENDPOINT);
      expect(result).toBe(mockXml);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
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
      expect(fetch).toHaveBeenCalledWith(`${LIST_ENDPOINT}?id=1`);
      expect(result).toEqual(mockArticle);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
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
      expect(fetch).toHaveBeenCalledWith(LIST_ENDPOINT);
      expect(result).toEqual(mockResponse);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
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
});
