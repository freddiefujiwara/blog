import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import BlogView from '../src/pages/BlogView.vue';

describe('App', () => {
  let router;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ids: ['latest-id'], article_cache: [] })
    }));
    router = createRouter({
      history: createMemoryHistory('/blog/'),
      routes: [
        { path: '/', component: BlogView },
        { path: '/:id', name: 'post', component: BlogView, props: true },
      ],
    });
    router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders latest article and sets title', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ids: ['latest-id'], article_cache: [] })
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

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    expect(wrapper.find('.site-title').text()).toBe('ミニマリストのブログ');
    expect(wrapper.find('h1').text()).toBe('最新記事');
    expect(wrapper.find('article').html()).toContain('本文です。');
    expect(document.title).toBe('最新記事');
    expect(wrapper.find('.footer-link a').attributes('href')).toBe('/blog/');
  });

  it('uses the path parameter when it exists in the list', async () => {
    const listData = {
      ids: ['first-id', 'middle-id', 'last-id'],
      article_cache: []
    };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(listData)
    });

    router.push('/middle-id');
    await router.isReady();

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(listData)
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

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const navs = wrapper.findAll('.navigation');
    expect(navs).toHaveLength(2);

    const topLinks = navs[0].findAll('a');
    const bottomLinks = navs[1].findAll('a');

    expect(topLinks).toHaveLength(2);
    expect(bottomLinks).toHaveLength(2);
    expect(topLinks[0].attributes('href')).toBe('/blog/first-id');
    expect(topLinks[1].attributes('href')).toBe('/blog/last-id');
    expect(bottomLinks[0].attributes('href')).toBe('/blog/first-id');
    expect(bottomLinks[1].attributes('href')).toBe('/blog/last-id');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'last-id',
          title: '最後の記事',
          markdown: '更新本文です。'
        })
    });

    router.push('/last-id');
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('最後の記事');
  });

  it('shows loading text while fetching a new article on route change', async () => {
    const listData = { ids: ['first-id', 'last-id'], article_cache: [] };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(listData)
    });

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(listData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'first-id',
            title: '先頭の記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    let resolveArticle;
    const articlePromise = new Promise((resolve) => {
      resolveArticle = resolve;
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => articlePromise
    });

    await router.push('/last-id');
    await flushPromises();

    expect(wrapper.find('.status').text()).toBe('読み込み中...');
    expect(wrapper.findAll('.navigation')).toHaveLength(0);

    resolveArticle({
      id: 'last-id',
      title: '最後の記事',
      markdown: '更新本文です。'
    });
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('最後の記事');
  });

  it('shows only the next link when the first article is selected', async () => {
    const listData = { ids: ['first-id', 'second-id'], article_cache: [] };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(listData)
    });

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(listData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'first-id',
            title: '先頭の記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const navs = wrapper.findAll('.navigation');
    expect(navs).toHaveLength(2);
    navs.forEach((nav) => {
      const links = nav.findAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].attributes('href')).toBe('/blog/second-id');
    });
  });

  it('shows only the previous link when the last article is selected', async () => {
    const listData = { ids: ['first-id', 'last-id'], article_cache: [] };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(listData)
    });

    router.push('/last-id');
    await router.isReady();

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(listData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'last-id',
            title: '最後の記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const navs = wrapper.findAll('.navigation');
    expect(navs).toHaveLength(2);
    navs.forEach((nav) => {
      const links = nav.findAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].attributes('href')).toBe('/blog/first-id');
    });
  });
});
