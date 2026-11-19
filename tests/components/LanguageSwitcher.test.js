import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import LanguageSwitcher from '../../src/components/LanguageSwitcher.vue';
import { LANGUAGE_STORAGE_KEY, applyRouteLang, currentLang, initLang, routeLang, setLang } from '../../src/services/i18n';

const mockRoute = reactive({ path: '/' });
const mockRouter = { push: vi.fn() };
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    applyRouteLang(null);
    routeLang.value = null;
    setLang('ja');
    localStorage.clear();
    mockRoute.path = '/';
  });

  afterEach(() => {
    applyRouteLang(null);
    routeLang.value = null;
    setLang('ja');
    vi.unstubAllGlobals();
  });

  it('offers the three languages under their own names', () => {
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    expect(buttons.map((b) => b.text())).toEqual(['日本語', 'English', '中文']);
  });

  it('marks the current language as active and pressed', () => {
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    expect(buttons[0].classes()).toContain('active');
    expect(buttons[0].attributes('aria-pressed')).toBe('true');
    expect(buttons[1].attributes('aria-pressed')).toBe('false');
  });

  it('switches and persists the language on click', async () => {
    mockRoute.path = '/some-article';
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    await buttons[2].trigger('click');
    expect(currentLang.value).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
    expect(buttons[2].classes()).toContain('active');
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('marks a browser-detected language as active without persisting it', async () => {
    vi.stubGlobal('navigator', { language: 'en-US', languages: ['en-US'] });
    expect(initLang()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();

    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    expect(buttons[1].classes()).toContain('active');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');

    // An explicit click is a manual choice and does persist.
    await buttons[0].trigger('click');
    expect(currentLang.value).toBe('ja');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  });

  it('navigates to the same article under the chosen language prefix', async () => {
    mockRoute.path = '/some-article';
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');

    await buttons[1].trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/en/some-article');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');

    mockRoute.path = '/en/some-article';
    await buttons[2].trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/zh/some-article');

    mockRoute.path = '/zh/some-article';
    await buttons[0].trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/some-article');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  });

  it('swaps the prefix on the root and tag pages too', async () => {
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');

    mockRoute.path = '/';
    await buttons[1].trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/en');

    mockRoute.path = '/en/tag/%E9%81%8B%E5%96%B6';
    await buttons[0].trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith('/tag/%E9%81%8B%E5%96%B6');
  });

  it('does not navigate when the chosen language is the current URL language', async () => {
    mockRoute.path = '/some-article';
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');

    // Japanese is the current page's language: the click only
    // records the preference (the UI language may still change).
    await buttons[0].trigger('click');
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ja');
  });

  it('marks the URL language as active on a translated page', () => {
    applyRouteLang('en');
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    expect(buttons[1].classes()).toContain('active');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
  });
});
