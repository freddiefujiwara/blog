import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LanguageSwitcher from '../../src/components/LanguageSwitcher.vue';
import { LANGUAGE_STORAGE_KEY, currentLang, setLang } from '../../src/services/i18n';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    setLang('ja');
    localStorage.clear();
  });

  afterEach(() => {
    setLang('ja');
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
    const wrapper = mount(LanguageSwitcher);
    const buttons = wrapper.findAll('.lang-switch-button');
    await buttons[2].trigger('click');
    expect(currentLang.value).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
    expect(buttons[2].classes()).toContain('active');
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});
