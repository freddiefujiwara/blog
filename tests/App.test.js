import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.history.pushState({}, '', '/blog');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders latest article and sets title', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['latest-id'])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'latest-id',
            title: '最新記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('.site-title').text()).toBe('ミニマリストのブログ');
    expect(wrapper.find('h1').text()).toBe('最新記事');
    expect(wrapper.find('article').html()).toContain('本文です。');
    expect(document.title).toBe('最新記事');
    expect(wrapper.find('.footer-link a').attributes('href')).toBe(
      'https://freddiefujiwara.com/blog/'
    );
  });

  it('uses the hash parameter when it exists in the list', async () => {
    window.history.pushState({}, '', '/blog/#middle-id');

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['first-id', 'middle-id', 'last-id'])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'middle-id',
            title: '中間記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App);
    await flushPromises();

    const navs = wrapper.findAll('.navigation');
    expect(navs).toHaveLength(2);

    const topLinks = navs[0].findAll('a');
    const bottomLinks = navs[1].findAll('a');

    expect(topLinks).toHaveLength(2);
    expect(bottomLinks).toHaveLength(2);
    expect(topLinks[0].attributes('href')).toBe('/blog/#first-id');
    expect(topLinks[1].attributes('href')).toBe('/blog/#last-id');
    expect(bottomLinks[0].attributes('href')).toBe('/blog/#first-id');
    expect(bottomLinks[1].attributes('href')).toBe('/blog/#last-id');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(['first-id', 'middle-id', 'last-id'])
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'last-id',
          title: '最後の記事',
          markdown: '更新本文です。'
        })
    });

    window.history.pushState({}, '', '/blog/#last-id');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('最後の記事');
  });
});
