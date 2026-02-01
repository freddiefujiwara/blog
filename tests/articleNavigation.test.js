import { describe, expect, it } from 'vitest';
import { resolveArticleId, buildNavigationLinks } from '../src/articleNavigation';

describe('articleNavigation helpers', () => {
  it('returns first id when query is missing', () => {
    expect(resolveArticleId(['a', 'b'], '')).toBe('a');
  });

  it('returns requested id when it exists in list', () => {
    expect(resolveArticleId(['a', 'b'], '?id=b')).toBe('b');
  });

  it('builds previous and next links', () => {
    const links = buildNavigationLinks(
      ['first', 'middle', 'last'],
      'middle',
      'https://example.com/list'
    );
    expect(links.prevLink).toBe('https://example.com/list?id=first');
    expect(links.nextLink).toBe('https://example.com/list?id=last');
  });

  it('returns only next link for the first item', () => {
    const links = buildNavigationLinks(
      ['first', 'second'],
      'first',
      'https://example.com/list'
    );
    expect(links.prevLink).toBe('');
    expect(links.nextLink).toBe('https://example.com/list?id=second');
  });
});
