import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchArticle, fetchArticleList } from '../../src/services/api';
import { LIST_ENDPOINT } from '../../src/constants';

describe('api service', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      const mockIds = ['1', '2'];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIds)
      });

      const result = await fetchArticleList();
      expect(fetch).toHaveBeenCalledWith(LIST_ENDPOINT);
      expect(result).toEqual(mockIds);
    });

    it('throws error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      await expect(fetchArticleList()).rejects.toThrow('記事一覧の取得に失敗しました。');
    });

    it('throws error when list is empty', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      await expect(fetchArticleList()).rejects.toThrow('最新記事が見つかりませんでした。');
    });

    it('throws error when list is null', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(null)
        });

        await expect(fetchArticleList()).rejects.toThrow('最新記事が見つかりませんでした。');
      });
  });
});
