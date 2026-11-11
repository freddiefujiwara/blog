import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import BlogView from '../src/pages/BlogView.vue';

describe('App', () => {
  let router;

  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return {
          ok: true,
          text: () => Promise.resolve('<rss>content</rss>')
        };
      }
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
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
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

    expect(wrapper.find('.header h1').text()).toBe('藤原史和｜川口を歩くQAエンジニア');
    expect(wrapper.find('article h1').text()).toBe('最新記事');
    expect(wrapper.find('article').html()).toContain('本文です。');
    expect(document.title).toBe('最新記事');
    // After redirect, URL should be /latest-id
    expect(router.currentRoute.value.path).toBe('/latest-id');
    expect(wrapper.find('.footer-link a').attributes('href')).toBe('/blog/latest-id');
  });

  it('groups the 16 footer links under 5 headings', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const groups = wrapper.findAll('.site-footer .foot-group');
    expect(groups.map((g) => g.find('.foot-group-title').text())).toEqual([
      'このサイト',
      'SNS',
      '口コミ',
      'プロフィール・その他',
      '自作ツール'
    ]);
    expect(groups.map((g) => g.findAll('.foot-links a').length)).toEqual([4, 3, 4, 4, 8]);
    expect(wrapper.findAll('.site-footer .foot-links a')).toHaveLength(23);
  });

  it('renders RSS link in the footer', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const rssLink = wrapper.find('.footer-link a[target="_blank"]');
    expect(rssLink.exists()).toBe(true);
    expect(rssLink.text()).toBe('RSS');
    expect(rssLink.attributes('href')).toBe('https://script.google.com/macros/s/AKfycbydcnw4yt5K8lz8Wf0PCbG6Q9yD3jf1W2lsGucOor2KII7duJr7qevcMiwNHJTe8GZH/exec?o=rss');
    expect(rssLink.attributes('rel')).toContain('noopener');
    expect(rssLink.attributes('rel')).toContain('noreferrer');

    const copyLink = wrapper.find('.copy-link');
    expect(copyLink.exists()).toBe(true);
    expect(copyLink.text()).toBe('コピー');
  });

  it('uses the path parameter when it exists in the list', async () => {
    const listData = {
      ids: ['first-id', 'middle-id', 'last-id'],
      article_cache: []
    };
    fetch.mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
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

    expect(wrapper.find('article h1').text()).toBe('最後の記事');
  });

  it('shows loading text while fetching a new article on route change', async () => {
    const listData = { ids: ['first-id', 'last-id'], article_cache: [] };

    let resolveArticle;
    const articlePromise = new Promise((resolve) => {
      resolveArticle = resolve;
    });

    fetch.mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
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

    expect(wrapper.find('article h1').text()).toBe('最後の記事');
  });

  it('shows only the next link when the first article is selected', async () => {
    const listData = { ids: ['first-id', 'second-id'], article_cache: [] };
    fetch.mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
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
        if (url.includes('?o=rss')) {
          return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
        }
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

  it('offers title search in the nav and hero, fed by the list titles', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
      if (url.includes('?id=')) {
        const id = url.split('?id=')[1];
        return {
          ok: true,
          json: () => Promise.resolve({ id, title: `Title ${id}`, markdown: '本文です。' })
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({
          ids: ['latest-id', 'older-id'],
          titles: { 'latest-id': '最新の記事タイトル', 'older-id': '川口の記事タイトル' },
          article_cache: []
        })
      };
    });
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    expect(wrapper.find('.nav-search input').exists()).toBe(true);
    const input = wrapper.find('.hero-search input');
    expect(input.exists()).toBe(true);

    await input.setValue('川口');
    const results = wrapper.findAll('.hero-search .title-search-item a');
    expect(results).toHaveLength(1);
    expect(results[0].text()).toBe('川口の記事タイトル');
    expect(results[0].attributes('href')).toBe('/blog/older-id');
  });

  it('primes the search from the cached list so it works before the fetch lands', async () => {
    localStorage.setItem('blog:list-cache:v1', JSON.stringify({
      ids: ['cached-id'],
      titles: { 'cached-id': '川口のキャッシュ記事' },
      article_cache: []
    }));
    fetch.mockImplementation(async () => {
      throw new Error('network down');
    });
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const input = wrapper.find('.hero-search input');
    expect(input.exists()).toBe(true);
    await input.setValue('川口');
    const results = wrapper.findAll('.hero-search .title-search-item a');
    expect(results).toHaveLength(1);
    expect(results[0].text()).toBe('川口のキャッシュ記事');
    expect(wrapper.find('.hero-search .title-search-status').exists()).toBe(false);
  });

  it('links the hero to the latest article, same as the footer link', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    });
    await flushPromises();

    const heroLink = wrapper.find('.hero a.hero-inner');
    expect(heroLink.exists()).toBe(true);
    // Same destination as the footer's 最新記事（トップ）へ戻る link
    expect(heroLink.attributes('href')).toBe('/blog/latest-id');
    expect(wrapper.find('.footer-link a').attributes('href')).toBe(
      heroLink.attributes('href')
    );
    expect(heroLink.find('h1').text()).toBe('藤原史和｜川口を歩くQAエンジニア');

    await heroLink.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/latest-id');
  });

  it('shows the shared nav with 川口の歌 and its play count', async () => {
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('music-count.json')) {
        return { ok: true, json: () => Promise.resolve({ count: 85, updated_at: 't' }) };
      }
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
      if (url.includes('?id=')) {
        const id = url.split('?id=')[1];
        return {
          ok: true,
          json: () => Promise.resolve({ id, title: `Title ${id}`, markdown: '本文です。' })
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ids: ['latest-id'], article_cache: [] })
      };
    });

    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const labels = wrapper.findAll('.site-nav ul li').map((li) => li.text());
    expect(labels).toEqual([
      'トップ',
      'プロフィール',
      '活動・発信',
      '情報交換',
      'ブログ',
      '持ち物リスト',
      '川口の歌 ♪85回再生',
    ]);
    const musicLink = wrapper.find('.site-nav a[href="https://freddiefujiwara.com/music"]');
    expect(musicLink.exists()).toBe(true);
    expect(musicLink.find('.music-play-count').text()).toBe('85回再生');
    // The three top-page section links fold away on narrow screens.
    expect(
      wrapper.findAll('.site-nav li.nav-section').map((li) => li.text())
    ).toEqual(['プロフィール', '活動・発信', '情報交換']);
  });

  it('hides the play count when music-count.json has no valid count', async () => {
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const musicLink = wrapper.find('.site-nav a[href="https://freddiefujiwara.com/music"]');
    expect(musicLink.exists()).toBe(true);
    expect(musicLink.text()).toBe('川口の歌 ♪');
    expect(wrapper.find('.music-play-count').exists()).toBe(false);
  });
});
