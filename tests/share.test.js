import { describe, expect, it } from 'vitest';
import { buildArticleUrl, buildShareLinks } from '../src/share';

describe('buildArticleUrl', () => {
  it('本番の記事URLを組み立てる', () => {
    expect(buildArticleUrl('abc123')).toBe('https://freddiefujiwara.com/blog/abc123');
  });
});

describe('buildShareLinks', () => {
  const links = buildShareLinks({
    title: 'テスト 記事',
    url: 'https://freddiefujiwara.com/blog/abc123'
  });
  const byKey = Object.fromEntries(links.map((l) => [l.key, l]));

  it('X・Facebook・LINE・Threadsの4件を返す', () => {
    expect(links.map((l) => l.key)).toEqual(['x', 'facebook', 'line', 'threads']);
  });

  it('XはタイトルとURLをエンコードして渡す', () => {
    expect(byKey.x.href).toBe(
      'https://twitter.com/intent/tweet?text=%E3%83%86%E3%82%B9%E3%83%88%20%E8%A8%98%E4%BA%8B&url=https%3A%2F%2Ffreddiefujiwara.com%2Fblog%2Fabc123'
    );
  });

  it('FacebookはURLだけを渡す', () => {
    expect(byKey.facebook.href).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ffreddiefujiwara.com%2Fblog%2Fabc123'
    );
  });

  it('LINEはURLだけを渡す', () => {
    expect(byKey.line.href).toBe(
      'https://social-plugins.line.me/lineit/share?url=https%3A%2F%2Ffreddiefujiwara.com%2Fblog%2Fabc123'
    );
  });

  it('ThreadsはタイトルとURLを改行でつないで渡す', () => {
    expect(byKey.threads.href).toBe(
      'https://www.threads.net/intent/post?text=%E3%83%86%E3%82%B9%E3%83%88%20%E8%A8%98%E4%BA%8B%0Ahttps%3A%2F%2Ffreddiefujiwara.com%2Fblog%2Fabc123'
    );
  });
});
