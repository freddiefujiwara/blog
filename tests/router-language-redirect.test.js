import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../src/router';
import {
  LANGUAGE_STORAGE_KEY,
  applyRouteLang,
  currentLang,
  routeLang,
  setLang
} from '../src/services/i18n';

// The URL is the single source of truth for language: a
// language-less URL whose viewer resolves to English or Chinese
// (the ?lang= parameter, the stored switcher choice, the
// browser's language — the initLang order) is replaced by the
// same page under that language's prefix. These tests drive the
// real router end to end.
const stubBrowserLanguages = (languages) => {
  vi.stubGlobal('navigator', { language: languages[0], languages });
};

let neutralCount = 0;

// Lands the router on a fresh language-less article URL (with a
// Japanese resolution, so it never redirects) so the navigation
// each test then makes is a real one, never a duplicate.
const resetRouter = async () => {
  neutralCount += 1;
  await router.replace(`/neutral-${neutralCount}`).catch(() => {});
};

const visit = async (url) => {
  await router.push(url).catch(() => {});
  return router.currentRoute.value;
};

describe('router language redirect', () => {
  beforeEach(async () => {
    localStorage.clear();
    stubBrowserLanguages(['ja-JP']);
    applyRouteLang(null);
    routeLang.value = null;
    setLang('ja');
    localStorage.clear();
    await resetRouter();
  });

  afterEach(() => {
    applyRouteLang(null);
    routeLang.value = null;
    setLang('ja');
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('sends an English browser at / to /en/', async () => {
    stubBrowserLanguages(['en-US']);
    const route = await visit('/');
    expect(route.path).toBe('/en');
    expect(route.name).toBe('lang-home');
    expect(route.params.lang).toBe('en');
    expect(currentLang.value).toBe('en');
    expect(routeLang.value).toBe('en');
  });

  it('sends a stored English preference at /<id> to /en/<id>', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const route = await visit('/stored-article');
    expect(route.path).toBe('/en/stored-article');
    expect(route.name).toBe('post');
    expect(route.params).toEqual({ lang: 'en', id: 'stored-article' });
  });

  it('sends a Chinese browser at /tag/<tag> to /zh/tag/<tag>', async () => {
    stubBrowserLanguages(['zh-CN']);
    const route = await visit(`/tag/${encodeURIComponent('運営')}`);
    expect(route.path).toBe(`/zh/tag/${encodeURIComponent('運営')}`);
    expect(route.name).toBe('tag');
    expect(route.params.lang).toBe('zh');
    // Tag names stay Japanese in every language.
    expect(route.params.tag).toBe('運営');
  });

  it('keeps a Japanese resolution on the language-less URLs', async () => {
    expect((await visit('/')).path).toBe('/');
    expect((await visit('/plain-article')).path).toBe('/plain-article');
    const tag = await visit(`/tag/${encodeURIComponent('運営')}`);
    expect(tag.path).toBe(`/tag/${encodeURIComponent('運営')}`);
    expect(tag.params.lang).toBeUndefined();
    expect(currentLang.value).toBe('ja');
    expect(routeLang.value).toBeNull();
  });

  it('never redirects a prefixed route, whatever the preference', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
    const en = await visit('/en/prefixed-article');
    expect(en.path).toBe('/en/prefixed-article');
    expect(en.params.lang).toBe('en');

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const zh = await visit('/zh/prefixed-article');
    expect(zh.path).toBe('/zh/prefixed-article');
    expect(zh.params.lang).toBe('zh');
  });

  it('does not loop: a stored English preference is stable on /en/', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    expect((await visit('/en/loop-article')).path).toBe('/en/loop-article');
    expect((await visit('/')).path).toBe('/en');
    expect((await visit('/loop-article')).path).toBe('/en/loop-article');
    expect(router.currentRoute.value.path).toBe('/en/loop-article');
  });

  it('lets the switcher\u2019s Japanese choice leave /en/<id> and stay', async () => {
    await visit('/en/switcher-article');
    expect(router.currentRoute.value.path).toBe('/en/switcher-article');

    // The switcher persists the choice, then navigates to the
    // same page without a prefix; the guard must not bounce it
    // back to /en/.
    setLang('ja');
    const route = await visit('/switcher-article');
    expect(route.path).toBe('/switcher-article');
    expect(route.params.lang).toBeUndefined();
    expect(currentLang.value).toBe('ja');
    expect(routeLang.value).toBeNull();
  });

  it('lands ?lang=en on the prefixed URL and drops the parameter', async () => {
    const route = await visit('/param-article?lang=en');
    expect(route.path).toBe('/en/param-article');
    expect(route.query.lang).toBeUndefined();

    const home = await visit('/?lang=zh');
    expect(home.path).toBe('/zh');
    expect(home.query.lang).toBeUndefined();
  });

  it('lets ?lang=ja override a stored English preference without redirecting', async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    const route = await visit('/param-ja-article?lang=ja');
    expect(route.path).toBe('/param-ja-article');
    expect(route.params.lang).toBeUndefined();
  });

  it('keeps other query parameters and the hash across the redirect', async () => {
    stubBrowserLanguages(['en-US']);
    const legacy = await visit('/?id=legacy-article');
    expect(legacy.path).toBe('/en');
    expect(legacy.query.id).toBe('legacy-article');

    const hashed = await visit('/hash-article#h-abcdef');
    expect(hashed.path).toBe('/en/hash-article');
    expect(hashed.hash).toBe('#h-abcdef');
  });
});
