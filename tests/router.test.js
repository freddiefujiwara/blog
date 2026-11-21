import { describe, expect, it } from 'vitest';
import router from '../src/router';

describe('router', () => {
  it('has correctly configured base and routes', () => {
    // Check history base
    // Note: router.options.history.base is accessible in some versions
    expect(router.options.history.base).toBe('/blog');

    const routes = router.options.routes;
    expect(routes).toHaveLength(4);

    expect(routes[0].path).toBe('/');
    expect(routes[0].name).toBe('home');
    expect(routes[1].path).toBe('/:lang(en|zh)');
    expect(routes[1].name).toBe('lang-home');
    expect(routes[2].path).toBe('/:lang(en|zh)?/tag/:tag');
    expect(routes[2].name).toBe('tag');
    expect(routes[2].props).toBe(true);
    expect(routes[3].path).toBe('/:lang(en|zh)?/:id');
    expect(routes[3].name).toBe('post');
    expect(routes[3].props).toBe(true);
  });

  it('scrolls to the top on navigation and restores the position on back/forward', () => {
    const { scrollBehavior } = router.options;
    expect(typeof scrollBehavior).toBe('function');
    // A fresh navigation (e.g. the prev/next pager at the foot of
    // an article) starts at the top of the next page.
    expect(scrollBehavior({}, {}, null)).toEqual({ top: 0 });
    expect(scrollBehavior({}, {}, undefined)).toEqual({ top: 0 });
    // Back/forward hands back the position the reader left.
    const saved = { left: 0, top: 420 };
    expect(scrollBehavior({}, {}, saved)).toBe(saved);
  });

  it('resolves routes to their views', async () => {
    // Basic check that components are defined
    const routes = router.options.routes;
    expect(routes[0].component.__name).toBe('BlogView');
    expect(routes[1].component.__name).toBe('BlogView');
    expect(routes[2].component.__name).toBe('TagView');
    expect(routes[3].component.__name).toBe('BlogView');
  });

  it('matches /tag/<tag> as the tag route, not as an article id', () => {
    const resolved = router.resolve(`/tag/${encodeURIComponent('運営')}`);
    expect(resolved.name).toBe('tag');
    expect(resolved.params.tag).toBe('運営');
    expect(resolved.params.lang).toBeUndefined();
  });

  it('keeps the Japanese routes in their original shape', () => {
    const home = router.resolve('/');
    expect(home.name).toBe('home');
    expect(home.params.lang).toBeUndefined();

    const post = router.resolve('/some-article-id');
    expect(post.name).toBe('post');
    expect(post.params).toEqual({ id: 'some-article-id' });
  });

  it('resolves the language roots to the lang-home route', () => {
    for (const lang of ['en', 'zh']) {
      const resolved = router.resolve(`/${lang}`);
      expect(resolved.name).toBe('lang-home');
      expect(resolved.params.lang).toBe(lang);
    }
    // A bare /en is the translated root, never an article named "en".
    expect(router.resolve('/en').params.id).toBeUndefined();
  });

  it('resolves translated article and tag routes with their lang param', () => {
    for (const lang of ['en', 'zh']) {
      const post = router.resolve(`/${lang}/some-article-id`);
      expect(post.name).toBe('post');
      expect(post.params).toEqual({ lang, id: 'some-article-id' });

      const tag = router.resolve(`/${lang}/tag/${encodeURIComponent('運営')}`);
      expect(tag.name).toBe('tag');
      expect(tag.params.lang).toBe(lang);
      // Tag names stay Japanese in every language.
      expect(tag.params.tag).toBe('運営');
    }
  });

  it('generates the same page in each language by name', () => {
    expect(router.resolve({ name: 'post', params: { id: 'abc' } }).path).toBe('/abc');
    expect(router.resolve({ name: 'post', params: { lang: 'en', id: 'abc' } }).path).toBe('/en/abc');
    expect(router.resolve({ name: 'post', params: { lang: 'zh', id: 'abc' } }).path).toBe('/zh/abc');
    expect(router.resolve({ name: 'lang-home', params: { lang: 'en' } }).path).toBe('/en');
    expect(router.resolve({ name: 'tag', params: { lang: 'zh', tag: '運営' } }).path)
      .toBe(`/zh/tag/${encodeURIComponent('運営')}`);
  });
});
