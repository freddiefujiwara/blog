import { describe, expect, it } from 'vitest';
import {
  buildTagIndex,
  extractArticleTags,
  extractTagsMap,
  filterArticlesByTag,
  normalizeTagList,
  tagPath
} from '../../src/services/tags';

describe('tags service', () => {
  describe('normalizeTagList', () => {
    it('keeps tag strings in order, trimmed and de-duplicated', () => {
      expect(normalizeTagList([' 運営 ', '技術', '運営', ''])).toEqual(['運営', '技術']);
    });

    it('drops non-string entries', () => {
      expect(normalizeTagList(['運営', 3, null, undefined])).toEqual(['運営']);
    });

    it('returns an empty list for non-array input', () => {
      expect(normalizeTagList(undefined)).toEqual([]);
      expect(normalizeTagList('運営')).toEqual([]);
      expect(normalizeTagList(null)).toEqual([]);
    });
  });

  describe('extractTagsMap', () => {
    it('extracts the id -> tags map from a list payload', () => {
      const data = {
        ids: ['a', 'b'],
        tags: { a: ['運営', '技術'], b: ['中国語'] }
      };
      expect(extractTagsMap(data)).toEqual({
        a: ['運営', '技術'],
        b: ['中国語']
      });
    });

    it('normalizes entries and drops ids whose tags end up empty', () => {
      const data = { tags: { a: [' 運営 ', '運営'], b: [], c: '技術' } };
      expect(extractTagsMap(data)).toEqual({ a: ['運営'] });
    });

    it('returns an empty map when the payload has no tags (older responses)', () => {
      expect(extractTagsMap({ ids: ['a'], titles: { a: 'T' } })).toEqual({});
      expect(extractTagsMap({ tags: null })).toEqual({});
      expect(extractTagsMap({ tags: ['運営'] })).toEqual({});
      expect(extractTagsMap(null)).toEqual({});
      expect(extractTagsMap(undefined)).toEqual({});
    });
  });

  describe('extractArticleTags', () => {
    it('extracts tags from an article response', () => {
      expect(extractArticleTags({ id: 'a', tags: ['運営', '技術'] })).toEqual([
        '運営',
        '技術'
      ]);
    });

    it('returns an empty list when the article has no tags field', () => {
      expect(extractArticleTags({ id: 'a', title: 'T', markdown: '...' })).toEqual([]);
      expect(extractArticleTags(null)).toEqual([]);
    });
  });

  describe('buildTagIndex', () => {
    const articles = [
      { id: 'a3', title: 'T3' },
      { id: 'a2', title: 'T2' },
      { id: 'a1', title: 'T1' }
    ];
    const tagsMap = {
      a3: ['運営', '技術'],
      a2: ['運営'],
      a1: ['中国語']
    };

    it('counts articles per tag, most frequent first, ties in gojuon order', () => {
      expect(buildTagIndex(articles, tagsMap)).toEqual([
        { tag: '運営', count: 2 },
        { tag: '技術', count: 1 },
        { tag: '中国語', count: 1 }
      ]);
    });

    it('only counts tags of articles in the given list', () => {
      expect(buildTagIndex([articles[0]], tagsMap)).toEqual([
        { tag: '運営', count: 1 },
        { tag: '技術', count: 1 }
      ]);
    });

    it('returns an empty index when there are no tags at all', () => {
      expect(buildTagIndex(articles, {})).toEqual([]);
      expect(buildTagIndex(articles, undefined)).toEqual([]);
      expect(buildTagIndex([], tagsMap)).toEqual([]);
    });
  });

  describe('filterArticlesByTag', () => {
    const articles = [
      { id: 'a3', title: 'T3' },
      { id: 'a2', title: 'T2' },
      { id: 'a1', title: 'T1' }
    ];
    const tagsMap = {
      a3: ['運営', '技術'],
      a2: ['運営'],
      a1: ['中国語']
    };

    it('keeps only articles carrying the tag, in list order (newest first)', () => {
      expect(filterArticlesByTag(articles, tagsMap, '運営')).toEqual([
        articles[0],
        articles[1]
      ]);
      expect(filterArticlesByTag(articles, tagsMap, '中国語')).toEqual([articles[2]]);
    });

    it('returns an empty list for an unknown tag or missing map', () => {
      expect(filterArticlesByTag(articles, tagsMap, '音楽')).toEqual([]);
      expect(filterArticlesByTag(articles, {}, '運営')).toEqual([]);
      expect(filterArticlesByTag(articles, undefined, '運営')).toEqual([]);
    });
  });

  describe('tagPath', () => {
    it('percent-encodes the tag name for the route', () => {
      expect(tagPath('運営')).toBe(`/tag/${encodeURIComponent('運営')}`);
    });
  });
});
