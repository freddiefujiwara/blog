import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LANG,
  HTML_LANG,
  LANGUAGE_STORAGE_KEY,
  MESSAGES,
  SUPPORTED_LANGS,
  TAG_LABELS,
  applyRouteLang,
  blogHomeUrl,
  contentLang,
  currentLang,
  detectBrowserLang,
  initLang,
  isSupportedLang,
  localizedPath,
  resolveInitialLang,
  resolveViewerLang,
  routeLang,
  setLang,
  t,
  tagLabel,
  topPageUrl
} from '../../src/services/i18n';

const stubBrowserLanguages = (languages) => {
  vi.stubGlobal('navigator', { language: languages[0], languages });
};

describe('i18n service', () => {
  beforeEach(() => {
    localStorage.clear();
    setLang(DEFAULT_LANG);
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    // A Japanese browser by default, so the initial-language
    // tests below exercise the param/stored steps deterministically.
    stubBrowserLanguages(['ja-JP']);
  });

  afterEach(() => {
    setLang(DEFAULT_LANG);
    window.history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
  });

  it('supports Japanese, English and Simplified Chinese, Japanese first', () => {
    expect(SUPPORTED_LANGS).toEqual(['ja', 'en', 'zh']);
    expect(DEFAULT_LANG).toBe('ja');
    expect(HTML_LANG).toEqual({ ja: 'ja', en: 'en', zh: 'zh-CN' });
  });

  it('has the same keys in every language, all non-empty strings', () => {
    const jaKeys = Object.keys(MESSAGES.ja).sort();
    expect(jaKeys.length).toBeGreaterThan(0);
    SUPPORTED_LANGS.forEach((lang) => {
      expect(Object.keys(MESSAGES[lang]).sort()).toEqual(jaKeys);
      Object.values(MESSAGES[lang]).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  it('translates into the current language', () => {
    expect(t('tocHeading')).toBe('目次');
    setLang('en');
    expect(t('tocHeading')).toBe('Contents');
    expect(t('searchPlaceholder')).toBe('Search by title');
    setLang('zh');
    expect(t('tocHeading')).toBe('目录');
    expect(t('searchPlaceholder')).toBe('按标题搜索');
  });

  it('fills {placeholders} from params and leaves unknown ones as-is', () => {
    expect(t('tagPageTitle', { tag: '川口' })).toBe('タグ：川口');
    setLang('en');
    expect(t('tagPageTitle', { tag: '川口' })).toBe('Tag: 川口');
    expect(t('tagPageTitle')).toBe('Tag: {tag}');
    expect(t('musicPlayCount', { count: '1,234' })).toBe('1,234 plays');
  });

  it('falls back to Japanese for a key a language does not carry', () => {
    const saved = MESSAGES.en.tocHeading;
    delete MESSAGES.en.tocHeading;
    try {
      setLang('en');
      expect(t('tocHeading')).toBe('目次');
    } finally {
      MESSAGES.en.tocHeading = saved;
    }
  });

  it('returns the key itself for an unknown key', () => {
    expect(t('noSuchKey')).toBe('noSuchKey');
    setLang('en');
    expect(t('noSuchKey')).toBe('noSuchKey');
  });

  it('resolves the initial language: parameter, then stored, then browser, then Japanese', () => {
    expect(resolveInitialLang({ param: 'en', stored: 'zh', browser: 'zh' })).toBe('en');
    expect(resolveInitialLang({ param: 'fr', stored: 'zh', browser: 'en' })).toBe('zh');
    expect(resolveInitialLang({ param: null, stored: 'en', browser: 'zh' })).toBe('en');
    expect(resolveInitialLang({ param: null, stored: null, browser: 'en' })).toBe('en');
    expect(resolveInitialLang({ param: null, stored: 'fr', browser: 'zh' })).toBe('zh');
    expect(resolveInitialLang({ param: 'fr', stored: 'fr', browser: 'fr' })).toBe('ja');
    expect(resolveInitialLang({})).toBe('ja');
    expect(resolveInitialLang()).toBe('ja');
  });

  it('maps browser language tags: en-* to English, any zh-* to Chinese', () => {
    expect(detectBrowserLang(['en'])).toBe('en');
    expect(detectBrowserLang(['en-US'])).toBe('en');
    expect(detectBrowserLang(['EN-GB'])).toBe('en');
    expect(detectBrowserLang(['zh-CN'])).toBe('zh');
    expect(detectBrowserLang(['zh-TW'])).toBe('zh');
    expect(detectBrowserLang(['zh-Hans-CN'])).toBe('zh');
    // The first mappable tag wins; unmappable ones are skipped.
    expect(detectBrowserLang(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectBrowserLang(['ja-JP'])).toBeNull();
    expect(detectBrowserLang(['fr-FR'])).toBeNull();
    expect(detectBrowserLang([])).toBeNull();
    expect(detectBrowserLang()).toBeNull();
    expect(detectBrowserLang(null)).toBeNull();
  });

  it('recognizes only the supported languages', () => {
    expect(isSupportedLang('ja')).toBe(true);
    expect(isSupportedLang('en')).toBe(true);
    expect(isSupportedLang('zh')).toBe(true);
    expect(isSupportedLang('fr')).toBe(false);
    expect(isSupportedLang('')).toBe(false);
    expect(isSupportedLang(null)).toBe(false);
  });

  it('persists the choice and updates the html lang attribute on switch', () => {
    setLang('en');
    expect(currentLang.value).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    setLang('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('ignores an unsupported language in setLang', () => {
    setLang('fr');
    expect(currentLang.value).toBe('ja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('initLang restores the persisted choice', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    expect(initLang()).toBe('en');
    expect(currentLang.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('initLang lets ?lang= win over the stored choice and persists it', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    window.history.replaceState(null, '', '/?lang=zh');
    expect(initLang()).toBe('zh');
    expect(currentLang.value).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
  });

  it('initLang ignores an invalid ?lang= and falls back to the stored choice', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    window.history.replaceState(null, '', '/?lang=fr');
    expect(initLang()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });

  it('initLang defaults to Japanese with nothing stored and no parameter', () => {
    expect(initLang()).toBe('ja');
    expect(currentLang.value).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
  });

  it('initLang applies the browser language when nothing is stored', () => {
    stubBrowserLanguages(['en-US']);
    expect(initLang()).toBe('en');
    expect(currentLang.value).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('initLang maps any Chinese browser variant to Simplified Chinese', () => {
    stubBrowserLanguages(['zh-TW']);
    expect(initLang()).toBe('zh');
    expect(currentLang.value).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('initLang does not persist a browser-detected language', () => {
    stubBrowserLanguages(['en-US']);
    expect(initLang()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    // With the preference still unset, the next visit re-evaluates
    // the browser: a Japanese browser now yields Japanese.
    stubBrowserLanguages(['ja-JP']);
    expect(initLang()).toBe('ja');
  });

  it('initLang prefers the stored choice over the browser language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
    stubBrowserLanguages(['en-US']);
    expect(initLang()).toBe('zh');
  });

  it('initLang prefers ?lang= over the browser language and persists it', () => {
    stubBrowserLanguages(['en-US']);
    window.history.replaceState(null, '', '/?lang=zh');
    expect(initLang()).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
  });

  it('initLang falls back to Japanese for an unsupported browser language', () => {
    stubBrowserLanguages(['fr-FR']);
    expect(initLang()).toBe('ja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('uses the production storage key outside staging builds', () => {
    expect(LANGUAGE_STORAGE_KEY).toBe('blog:lang:v1');
  });

  describe('resolveViewerLang (the router\u2019s resolution)', () => {
    it('resolves the parameter first, then stored, then browser, then Japanese', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
      stubBrowserLanguages(['en-US']);
      expect(resolveViewerLang('en')).toBe('en');
      expect(resolveViewerLang(null)).toBe('zh');

      localStorage.clear();
      expect(resolveViewerLang(null)).toBe('en');

      stubBrowserLanguages(['ja-JP']);
      expect(resolveViewerLang(null)).toBe('ja');
    });

    it('ignores an unsupported parameter and does not persist anything', () => {
      stubBrowserLanguages(['en-US']);
      expect(resolveViewerLang('fr')).toBe('en');
      expect(resolveViewerLang(null)).toBe('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
      expect(currentLang.value).toBe('ja');
    });
  });

  describe('route language (translated URLs)', () => {
    afterEach(() => {
      applyRouteLang(null);
      routeLang.value = null;
    });

    it('defaults to no route language and Japanese content', () => {
      expect(routeLang.value).toBeNull();
      expect(contentLang.value).toBe('ja');
    });

    it('applyRouteLang makes the URL language drive UI and content', () => {
      expect(applyRouteLang('en')).toBe('en');
      expect(routeLang.value).toBe('en');
      expect(contentLang.value).toBe('en');
      expect(currentLang.value).toBe('en');
      expect(document.documentElement.lang).toBe('en');

      expect(applyRouteLang('zh')).toBe('zh');
      expect(routeLang.value).toBe('zh');
      expect(contentLang.value).toBe('zh');
      expect(currentLang.value).toBe('zh');
      expect(document.documentElement.lang).toBe('zh-CN');
    });

    it('does not persist a route language as the UI preference', () => {
      applyRouteLang('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    });

    it('leaving a translated route restores the stored UI preference', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh');
      applyRouteLang('en');
      expect(currentLang.value).toBe('en');
      applyRouteLang(null);
      expect(routeLang.value).toBeNull();
      expect(contentLang.value).toBe('ja');
      expect(currentLang.value).toBe('zh');
      expect(document.documentElement.lang).toBe('zh-CN');
    });

    it('leaving a translated route falls back to the browser language', () => {
      stubBrowserLanguages(['en-US']);
      applyRouteLang('zh');
      applyRouteLang(null);
      expect(currentLang.value).toBe('en');
    });

    it('ignores unsupported route languages', () => {
      expect(applyRouteLang('fr')).toBe('ja');
      expect(routeLang.value).toBeNull();
      expect(contentLang.value).toBe('ja');
      expect(applyRouteLang('ja')).toBe('ja');
      expect(routeLang.value).toBeNull();
    });

    it('a Japanese-to-Japanese application keeps the phase-1 state', () => {
      setLang('en');
      localStorage.clear();
      // No route language was ever applied, so nothing is re-resolved:
      // the in-session UI choice stands even without storage.
      expect(applyRouteLang(null)).toBe('en');
      expect(currentLang.value).toBe('en');
    });
  });

  describe('localizedPath', () => {
    it('adds, swaps and removes the language prefix, keeping the page', () => {
      expect(localizedPath('/', 'ja')).toBe('/');
      expect(localizedPath('/', 'en')).toBe('/en');
      expect(localizedPath('/', 'zh')).toBe('/zh');
      expect(localizedPath('/abc', 'ja')).toBe('/abc');
      expect(localizedPath('/abc', 'en')).toBe('/en/abc');
      expect(localizedPath('/en/abc', 'ja')).toBe('/abc');
      expect(localizedPath('/en/abc', 'zh')).toBe('/zh/abc');
      expect(localizedPath('/zh/abc', 'en')).toBe('/en/abc');
      expect(localizedPath('/en', 'ja')).toBe('/');
      expect(localizedPath('/en', 'zh')).toBe('/zh');
      expect(localizedPath('/tag/x', 'en')).toBe('/en/tag/x');
      expect(localizedPath('/en/tag/x', 'ja')).toBe('/tag/x');
    });

    it('treats an unsupported language as Japanese (no prefix)', () => {
      expect(localizedPath('/en/abc', 'fr')).toBe('/abc');
      expect(localizedPath('/abc', null)).toBe('/abc');
    });
  });

  describe('top page and blog home URLs', () => {
    it('keeps the plain Japanese URLs for Japanese', () => {
      expect(topPageUrl('ja')).toBe('https://freddiefujiwara.com/');
      expect(topPageUrl('ja', '#about')).toBe('https://freddiefujiwara.com/#about');
      expect(topPageUrl('ja', '#activity')).toBe('https://freddiefujiwara.com/#activity');
      expect(topPageUrl('ja', '#contact')).toBe('https://freddiefujiwara.com/#contact');
      expect(blogHomeUrl('ja')).toBe('https://freddiefujiwara.com/blog/');
    });

    it('inserts the language segment for English and Chinese, anchors after it', () => {
      expect(topPageUrl('en')).toBe('https://freddiefujiwara.com/en/');
      expect(topPageUrl('en', '#about')).toBe('https://freddiefujiwara.com/en/#about');
      expect(topPageUrl('en', '#activity')).toBe('https://freddiefujiwara.com/en/#activity');
      expect(topPageUrl('en', '#contact')).toBe('https://freddiefujiwara.com/en/#contact');
      expect(blogHomeUrl('en')).toBe('https://freddiefujiwara.com/blog/en/');
      expect(topPageUrl('zh')).toBe('https://freddiefujiwara.com/zh/');
      expect(topPageUrl('zh', '#about')).toBe('https://freddiefujiwara.com/zh/#about');
      expect(blogHomeUrl('zh')).toBe('https://freddiefujiwara.com/blog/zh/');
    });

    it('treats an unsupported language as Japanese (no segment)', () => {
      expect(topPageUrl('fr')).toBe('https://freddiefujiwara.com/');
      expect(topPageUrl(null)).toBe('https://freddiefujiwara.com/');
      expect(blogHomeUrl('fr')).toBe('https://freddiefujiwara.com/blog/');
    });
  });

  describe('tag labels', () => {
    it('carries a label for every known tag in English and Chinese', () => {
      const tags = ['運営', '技術', '中国語', '音楽', '川口', '暮らし'];
      expect(Object.keys(TAG_LABELS.en).sort()).toEqual([...tags].sort());
      expect(Object.keys(TAG_LABELS.zh).sort()).toEqual([...tags].sort());
    });

    it('translates the display label in English and Chinese', () => {
      setLang('en');
      expect(tagLabel('運営')).toBe('Site operations');
      expect(tagLabel('技術')).toBe('Tech');
      expect(tagLabel('中国語')).toBe('Chinese');
      expect(tagLabel('音楽')).toBe('Music');
      expect(tagLabel('川口')).toBe('Kawaguchi');
      expect(tagLabel('暮らし')).toBe('Daily life');
      setLang('zh');
      expect(tagLabel('運営')).toBe('网站运营');
      expect(tagLabel('技術')).toBe('技术');
      expect(tagLabel('中国語')).toBe('中文');
      expect(tagLabel('音楽')).toBe('音乐');
      expect(tagLabel('川口')).toBe('川口');
      expect(tagLabel('暮らし')).toBe('生活');
    });

    it('shows the raw tag name in Japanese UI', () => {
      setLang('ja');
      expect(tagLabel('運営')).toBe('運営');
      expect(tagLabel('暮らし')).toBe('暮らし');
    });

    it('falls back to the raw tag name for a tag outside the mapping', () => {
      setLang('en');
      expect(tagLabel('未分類')).toBe('未分類');
      setLang('zh');
      expect(tagLabel('未分類')).toBe('未分類');
    });
  });

  // Kept last: it reloads the module under a stubbed staging env,
  // which must not leak into the other tests.
  it('uses a staging-suffixed storage key in staging builds', async () => {
    vi.stubEnv('VITE_STAGING', '1');
    vi.resetModules();
    try {
      const stagingModule = await import('../../src/services/i18n');
      expect(stagingModule.LANGUAGE_STORAGE_KEY).toBe('blog:lang:v1:staging');
    } finally {
      vi.stubEnv('VITE_STAGING', '');
    }
  });
});
