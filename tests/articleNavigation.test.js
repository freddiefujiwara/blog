import { describe, expect, it } from 'vitest';
import { resolveArticleId, buildNavigationLinks } from '../src/articleNavigation';

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

  it('prefers hash over path and search', () => {
    expect(
      resolveArticleId(['a', 'b', 'c'], {
        path: '/blog/b',
        search: '?id=a',
        hash: '#c'
      })
    ).toBe('c');
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
    expect(links.prevLink).toBe('/blog/#first');
    expect(links.nextLink).toBe('/blog/#last');
  });

  it('supports custom base paths for navigation links', () => {
    const links = buildNavigationLinks(['a', 'b'], 'a', '/blog/');
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('/blog/#b');
  });

  it('returns only next link for the first item', () => {
    const links = buildNavigationLinks(['first', 'second'], 'first');
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('/blog/#second');
  });

  it('returns empty links if ids is empty or not an array', () => {
    expect(buildNavigationLinks([], 'a')).toEqual({ prevLink: '', nextLink: '' });
    expect(buildNavigationLinks(null, 'a')).toEqual({ prevLink: '', nextLink: '' });
  });

  it('returns empty links if currentId is not in list', () => {
    expect(buildNavigationLinks(['a', 'b'], 'c')).toEqual({ prevLink: '', nextLink: '' });
  });

  it('handles empty basePath and leading/trailing slashes', () => {
    const links = buildNavigationLinks(['a', 'b'], 'a', '');
    expect(links.nextLink).toBe('/blog/#b');

    const links2 = buildNavigationLinks(['a', 'b'], 'a', '///');
    expect(links2.nextLink).toBe('/blog/#b');
  });
});
