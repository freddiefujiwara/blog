import { describe, expect, it } from 'vitest';
import {
  resolveArticleId,
  buildNavigationLinks,
  extractRequestedId
} from '../src/articleNavigation';

describe('articleNavigation helpers', () => {
  it('returns first id when query is missing', () => {
    expect(
      resolveArticleId(['a', 'b'], { path: '/blog', search: '', hash: '' })
    ).toBe('a');
  });

  it('returns requested id when it exists in list', () => {
    expect(
      resolveArticleId(['a', 'b'], {
        path: '/blog',
        search: '?id=b',
        hash: ''
      })
    ).toBe('b');
  });

  it('prefers the path id over hash and search when it names an article', () => {
    expect(
      resolveArticleId(['a', 'b', 'c'], {
        path: '/blog/b',
        search: '?id=a',
        hash: '#c'
      })
    ).toBe('b');
  });

  it('ignores an in-article fragment in the hash when the path names an article', () => {
    expect(
      resolveArticleId(['a', 'b'], {
        path: '/blog/b',
        search: '',
        hash: '#item-12345678'
      })
    ).toBe('b');
    expect(
      resolveArticleId(['a', 'b'], {
        path: '/blog/b',
        search: '',
        hash: '#h-12345678'
      })
    ).toBe('b');
  });

  it('falls back to the hash id when the path names no article', () => {
    expect(
      resolveArticleId(['a', 'b'], {
        path: '/blog/tag/x',
        search: '',
        hash: '#b'
      })
    ).toBe('b');
  });

  it('returns requested id when it exists in the hash', () => {
    expect(
      resolveArticleId(['a', 'b'], { path: '/blog', search: '', hash: '#b' })
    ).toBe('b');
    expect(
      resolveArticleId(['a', 'b'], { path: '/blog', search: '', hash: 'b' })
    ).toBe('b');
  });

  it('returns requested id when it exists in the path', () => {
    expect(
      resolveArticleId(['a', 'b'], { path: '/blog/b', search: '', hash: '' })
    ).toBe('b');
  });

  it('returns empty string if ids is empty or not an array', () => {
    expect(resolveArticleId([], { path: '/blog', search: '', hash: '' })).toBe('');
    expect(resolveArticleId(null, { path: '/blog', search: '', hash: '' })).toBe('');
  });

  it('builds previous and next links', () => {
    const links = buildNavigationLinks(['first', 'middle', 'last'], 'middle');
    expect(links.prevLink).toBe('/first');
    expect(links.nextLink).toBe('/last');
    expect(links.prevId).toBe('first');
    expect(links.nextId).toBe('last');
  });

  it('supports custom base paths for navigation links', () => {
    const links = buildNavigationLinks(['a', 'b'], 'a', '/blog/');
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('/blog/b');
    expect(links.prevId).toBe('');
    expect(links.nextId).toBe('b');
  });

  it('returns only next link for the first item', () => {
    const links = buildNavigationLinks(['first', 'second'], 'first');
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('/second');
    expect(links.prevId).toBe('');
    expect(links.nextId).toBe('second');
  });

  it('returns empty links if ids is empty or not an array', () => {
    const expected = { prevId: '', nextId: '', prevLink: '', nextLink: '' };
    expect(buildNavigationLinks([], 'a')).toEqual(expected);
    expect(buildNavigationLinks(null, 'a')).toEqual(expected);
  });

  it('returns empty links if currentId is not in list', () => {
    const expected = { prevId: '', nextId: '', prevLink: '', nextLink: '' };
    expect(buildNavigationLinks(['a', 'b'], 'c')).toEqual(expected);
  });

  it('handles empty basePath and leading/trailing slashes', () => {
    const links = buildNavigationLinks(['a', 'b'], 'a', '');
    expect(links.nextLink).toBe('/b');

    const links2 = buildNavigationLinks(['a', 'b'], 'a', '///');
    expect(links2.nextLink).toBe('/b');
  });

  it('extracts the requested id without checking the list', () => {
    expect(
      extractRequestedId({ path: '/blog/b', search: '', hash: '' })
    ).toBe('b');
    // Unknown ids are returned as-is; membership is resolveArticleId's job.
    expect(
      extractRequestedId({ path: '/blog/unknown', search: '', hash: '' })
    ).toBe('unknown');
    expect(
      extractRequestedId({ path: '/blog', search: '', hash: '#xyz' })
    ).toBe('xyz');
    expect(
      extractRequestedId({ path: '/blog', search: '?id=q1', hash: '' })
    ).toBe('q1');
    expect(extractRequestedId({ path: '/blog', search: '', hash: '' })).toBe(
      ''
    );
  });

  it('prefers the path over hash and search when extracting', () => {
    expect(
      extractRequestedId({
        path: '/blog/from-path',
        search: '?id=from-search',
        hash: '#from-hash'
      })
    ).toBe('from-path');
  });
});
