import { describe, expect, it } from 'vitest';
import { resolveArticleId, buildNavigationLinks } from '../src/articleNavigation';

describe('articleNavigation helpers', () => {
  it('returns first id when query is missing', () => {
    expect(resolveArticleId(['a', 'b'], { path: '/blog', search: '' })).toBe('a');
  });

  it('returns requested id when it exists in list', () => {
    expect(resolveArticleId(['a', 'b'], { path: '/blog', search: '?id=b' })).toBe('b');
  });

  it('returns requested id when it exists in the path', () => {
    expect(resolveArticleId(['a', 'b'], { path: '/blog/b', search: '' })).toBe('b');
  });

  it('builds previous and next links', () => {
    const links = buildNavigationLinks(
      ['first', 'middle', 'last'],
      'middle',
      '/blog'
    );
    expect(links.prevLink).toBe('/blog/first');
    expect(links.nextLink).toBe('/blog/last');
  });

  it('returns only next link for the first item', () => {
    const links = buildNavigationLinks(['first', 'second'], 'first', '/blog');
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('/blog/second');
  });
});
