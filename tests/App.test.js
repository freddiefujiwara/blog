import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import BlogView from '../src/pages/BlogView.vue';

describe('App', () => {
  let router;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (url.includes('?id=')) {
        const id = url.split('?id=')[1];
        return {
          ok: true,
          json: () => Promise.resolve({ id, title: `Title ${id}`, markdown: `Content ${id}` })
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ids: ['latest-id'], article_cache: [] })
      };
    }));
    router = createRouter({
      history: createMemoryHistory('/blog/'),
      routes: [
        { path: '/', component: BlogView },
        { path: '/:id', name: 'post', component: BlogView, props: true },
      ],
    });
    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders latest article and sets title', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.includes('?id=')) {
        return {
          ok: true,
          json: () => Promise.resolve({ id: 'latest-id', title: '最新記事', markdown: '本文です。' })
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ids: ['latest-id'], article_cache: [] })
      };
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
    // After redirect, URL should be /latest-id
    expect(router.currentRoute.value.path).toBe('/latest-id');
    expect(wrapper.find('.footer-link a').attributes('href')).toBe('/blog/latest-id');
  });

  it('uses the path parameter when it exists in the list', async () => {
    const listData = {
      ids: ['first-id', 'middle-id', 'last-id'],
      article_cache: []
    };
    fetch.mockImplementation(async (url) => {
      if (url.includes('?id=')) {
        const id = url.split('?id=')[1];
        let title = `Title ${id}`;
        if (id === 'middle-id') title = '中間記事';
        if (id === 'last-id') title = '最後の記事';
        return {
          ok: true,
          json: () => Promise.resolve({ id, title, markdown: '本文です。' })
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve(listData)
      };
    });

    await router.push('/middle-id');

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

    await router.push('/last-id');
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('最後の記事');
  });

  it('shows loading text while fetching a new article on route change', async () => {
    const listData = { ids: ['first-id', 'last-id'], article_cache: [] };

    let resolveArticle;
    const articlePromise = new Promise((resolve) => {
      resolveArticle = resolve;
    });

    fetch.mockImplementation(async (url) => {
      if (url.includes('?id=first-id')) {
        return {
          ok: true,
          json: () => Promise.resolve({ id: 'first-id', title: '先頭の記事', markdown: '本文です。' })
        };
      }
      if (url.includes('?id=last-id')) {
        return {
          ok: true,
          json: () => articlePromise
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve(listData)
      };
    });

    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const pushPromise = router.push('/last-id');
    await flushPromises();

    expect(wrapper.find('.status').text()).toBe('読み込み中...');
    await pushPromise;

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
    fetch.mockImplementation(async (url) => {
      if (url.includes('?id=first-id')) {
        return {
          ok: true,
          json: () => Promise.resolve({ id: 'first-id', title: '先頭の記事', markdown: '本文です。' })
        };
      }
      if (url.includes('?id=')) {
          const id = url.split('?id=')[1];
          return { ok: true, json: () => Promise.resolve({ id, title: `Title ${id}` }) };
      }
      return {
        ok: true,
        json: () => Promise.resolve(listData)
      };
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
    fetch.mockImplementation(async (url) => {
        if (url.includes('?id=last-id')) {
          return {
            ok: true,
            json: () => Promise.resolve({ id: 'last-id', title: '最後の記事', markdown: '本文です。' })
          };
        }
        if (url.includes('?id=')) {
            const id = url.split('?id=')[1];
            return { ok: true, json: () => Promise.resolve({ id, title: `Title ${id}` }) };
        }
        return {
          ok: true,
          json: () => Promise.resolve(listData)
        };
      });

    await router.push('/last-id');

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
