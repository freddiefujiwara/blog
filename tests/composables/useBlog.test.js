import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useBlog } from '../../src/composables/useBlog';
import { flushPromises, mount } from '@vue/test-utils';
import * as api from '../../src/services/api';
import { defineComponent, reactive } from 'vue';
import { applyRouteLang, routeLang } from '../../src/services/i18n';

vi.mock('../../src/services/api');

let mockRoute = reactive({ path: '/blog', params: {} });
let routeToReturn = mockRoute;
const mockRouter = {
  replace: vi.fn(),
};
vi.mock('vue-router', () => ({
  useRoute: () => routeToReturn,
  useRouter: () => mockRouter,
}));

describe('useBlog composable', () => {
  const TestComponent = defineComponent({
    setup() {
      const blog = useBlog();
      return { ...blog };
    },
    template: '<div></div>'
  });

  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRoute.path = '/blog';
    mockRoute.params = {};
    routeToReturn = mockRoute;
    vi.stubGlobal('location', {
        pathname: '/blog',
        search: '',
        hash: ''
    });
    document.title = '';
  });

  afterEach(() => {
    if (wrapper) {
        wrapper.unmount();
        wrapper = null;
    }
    vi.unstubAllGlobals();
  });

  it('loads article on mount', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    wrapper = mount(TestComponent);
    expect(wrapper.vm.articleHtml).toBe(''); // Line 17 coverage

    await flushPromises();

    expect(wrapper.vm.article.title).toBe('Title 1');
    expect(wrapper.vm.articleHtml).toMatch(/<h1 id="h-[0-9a-f]{8}">Content 1<\/h1>/);
    expect(document.title).toBe('Title 1');
  });

  it('renders the article from the titles fast path without waiting for the full list', async () => {
    api.fetchArticleTitles.mockResolvedValue({ ids: ['1', '2'], titles: { 1: 'Title 1', 2: 'Title 2' } });
    api.fetchArticleList.mockReturnValue(new Promise(() => {})); // full list still in flight
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(api.fetchArticleTitles).toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe('Title 1');
    expect(wrapper.vm.articleIds).toEqual(['1', '2']);
  });

  it('falls back to the full list when the titles response fails', async () => {
    api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(api.fetchArticleList).toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe('Title 1');
  });

  it('never fetches the full list on a Japanese load when titles succeed', async () => {
    api.fetchArticleTitles.mockResolvedValue({ ids: ['1', '2'], titles: { 1: 'Title 1', 2: 'Title 2' } });
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(api.fetchArticleList).not.toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe('Title 1');
  });

  it('fetches a deep-linked article itself instead of using list bodies', async () => {
    mockRoute.path = '/2';
    mockRoute.params = { id: '2' };
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    api.fetchArticleTitles.mockResolvedValue({ ids: ['1', '2'], titles: { 1: 'Title 1', 2: 'Title 2' } });
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: [{ id: '2', title: 'Title 2', markdown: 'From the list' }]
    });
    api.fetchArticle.mockResolvedValue({ id: '2', title: 'Title 2', markdown: 'Fetched directly' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(api.fetchArticleList).not.toHaveBeenCalled();
    expect(api.fetchArticle).toHaveBeenCalledWith('2');
    expect(wrapper.vm.article.markdown).toBe('Fetched directly');

    // Leave the titles mock rejecting, as the tests below assume:
    // mock implementations survive vi.clearAllMocks in this file,
    // and the fallback test above is what set that state.
    api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));
  });

  it('handles error on mount', async () => {
    api.fetchArticleList.mockRejectedValue(new Error('List Error'));

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('List Error');
  });

  it('handles route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => ({ id, title: `Title ${id}`, markdown: `Content ${id}` }));

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');

    // Simulate route change
    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

    await flushPromises();

    expect(wrapper.vm.article.id).toBe('2');
  });

  it('handles error on route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => {
      if (id === '1') return { id: '1', title: 'Title 1', markdown: 'Content 1' };
      throw new Error('Fetch Error');
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('Fetch Error');
  });

  it('handles error without message on route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => {
      if (id === '1') return { id: '1', title: 'Title 1', markdown: 'Content 1' };
      throw {};
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('読み込みに失敗しました。');
  });

  it('handles case where no article id is resolved', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: [], article_cache: [] }); // Empty list

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('最新記事が見つかりませんでした。');
  });

  it('does not reload if same article id', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => ({ id, title: `Title ${id}` }));

    wrapper = mount(TestComponent);
    await flushPromises();
    // Initial fetch '1' + prefetch '2'
    expect(api.fetchArticle).toHaveBeenCalledTimes(2);

    // Trigger watcher with same path (should not happen in real app as path would change,
    // but testing the loadArticleFromLocation internal check)
    mockRoute.path = '/blog';
    await flushPromises();
    // Should still be 2 because currentId is same
    expect(api.fetchArticle).toHaveBeenCalledTimes(2);
  });

  it('does not reload if same article id via different path', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => ({ id, title: `Title ${id}` }));

    // Start at /1
    mockRoute.path = '/1';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1' });

    wrapper = mount(TestComponent);
    await flushPromises();
    // Initial fetch '1' + prefetch '2'
    expect(api.fetchArticle).toHaveBeenCalledTimes(2);

    // Change to /blog (which resolves to '1')
    mockRoute.path = '/blog';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog' });
    await flushPromises();

    // Should still be 2
    expect(api.fetchArticle).toHaveBeenCalledTimes(2);
  });

  it('uses article_cache if available', async () => {
    const cachedArticle = { id: '1', title: 'Cached Title', markdown: 'Cached Content' };
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: [cachedArticle]
    });
    api.fetchArticle.mockImplementation(async (id) => ({ id, title: `Title ${id}` }));

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.title).toBe('Cached Title');
    // fetchArticle('1') was skipped, but fetchArticle('2') was called for prefetch
    expect(api.fetchArticle).not.toHaveBeenCalledWith('1');
    expect(api.fetchArticle).toHaveBeenCalledWith('2');
    expect(document.title).toBe('Cached Title');
  });

  it('populates cache and uses it on route change', async () => {
    const cachedArticle2 = { id: '2', title: 'Cached Title 2', markdown: 'Cached Content 2' };
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: [cachedArticle2] // Preload article 2
    });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
    expect(api.fetchArticle).toHaveBeenCalledWith('1');

    // Change to article 2
    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('2');
    expect(wrapper.vm.article.title).toBe('Cached Title 2');
    // fetchArticle should NOT have been called for '2'
    expect(api.fetchArticle).not.toHaveBeenCalledWith('2');
  });

  it('handles article_cache being null or missing', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2']
      // article_cache missing
    });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
    expect(api.fetchArticle).toHaveBeenCalledWith('1');
  });

  it('handles article without markdown', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1' }); // markdown missing

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.articleHtml).toBe('');
  });

  it('redirects to the first article ID when on the root path', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['first-id', 'second-id'],
      article_cache: []
    });
    // Setting route path to '/'
    mockRoute.path = '/';

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'post',
      params: { id: 'first-id' }
    });
  });

  it('handles error without message on mount', async () => {
    api.fetchArticleList.mockRejectedValue({}); // No message

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('読み込みに失敗しました。');
  });

  it('provides prevTitle and nextTitle from cache', async () => {
    const articles = [
      { id: '1', title: 'Title 1' },
      { id: '2', title: 'Title 2' },
      { id: '3', title: 'Title 3' }
    ];
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2', '3'],
      article_cache: articles
    });
    // Start with article 2
    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('2');
    expect(wrapper.vm.prevTitle).toBe('Title 1');
    expect(wrapper.vm.nextTitle).toBe('Title 3');
  });

  it('uses window.location if route is not available', async () => {
    routeToReturn = null;
    api.fetchArticleList.mockResolvedValue({ ids: ['1'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content' });

    vi.stubGlobal('location', {
      pathname: '/blog/1',
      search: '',
      hash: ''
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
  });

  it('handles error in watcher', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => {
      if (id === '1') return { id: '1', title: 'Title 1', markdown: 'Content 1' };
      throw new Error('Watch Error');
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    // Trigger watcher error
    mockRoute.path = '/2';
    // Watcher is triggered by mockRoute.path change because it's reactive

    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('Watch Error');
  });

  it('handles error without message in watcher', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockImplementation(async (id) => {
      if (id === '1') return { id: '1', title: 'Title 1', markdown: 'Content 1' };
      throw {};
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    api.fetchArticle.mockImplementation(async (id) => {
        throw {};
    });
    mockRoute.path = '/2';

    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('読み込みに失敗しました。');
  });

  it('does not load if already loading', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    let resolveFirst;
    api.fetchArticle.mockReturnValue(new Promise(r => resolveFirst = r));

    wrapper = mount(TestComponent);
    await flushPromises(); // Reach the await getArticle('1')

    expect(api.fetchArticle).toHaveBeenCalledWith('1');

    mockRoute.path = '/2';
    await flushPromises();

    // Should NOT have called fetchArticle with '2' because loading is true
    expect(api.fetchArticle).not.toHaveBeenCalledWith('2');
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);

    resolveFirst({ id: '1', title: 'T1' });
    await flushPromises();
  });

  it('saves fetched article to cache and prefetches neighbors', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2', '3'],
      article_cache: []
    });
    api.fetchArticle.mockImplementation(async (id) => {
      return { id, title: `Title ${id}` };
    });

    // Start at /1
    mockRoute.path = '/1';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
    expect(api.fetchArticle).toHaveBeenCalledWith('1');

    // Wait for prefetch of '2'
    await flushPromises();
    expect(api.fetchArticle).toHaveBeenCalledWith('2');
    expect(wrapper.vm.nextTitle).toBe('Title 2');

    // Navigate to /2
    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('2');
    expect(wrapper.vm.article.title).toBe('Title 2');
    // Should NOT have called fetchArticle('2') again
    // 3 calls: '1' (initial), '2' (prefetch from 1), '3' (prefetch from 2)
    expect(api.fetchArticle).toHaveBeenCalledTimes(3);
    expect(api.fetchArticle).toHaveBeenCalledWith('3');

    expect(wrapper.vm.prevTitle).toBe('Title 1');
    expect(wrapper.vm.nextTitle).toBe('Title 3');
  });

  it('handles prefetch errors gracefully', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: []
    });
    api.fetchArticle.mockImplementation(async (id) => {
      if (id === '1') return { id: '1', title: 'Title 1' };
      throw new Error('Prefetch Failed');
    });

    mockRoute.path = '/1';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
    expect(wrapper.vm.errorMessage).toBe('');

    await flushPromises(); // Prefetch '2' fails
    expect(wrapper.vm.errorMessage).toBe(''); // Still empty
    expect(wrapper.vm.nextTitle).toBe(''); // Not cached
  });

  it('starts fetching a deep-linked article before the list resolves', async () => {
    let resolveList;
    api.fetchArticleList.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      })
    );
    api.fetchArticle.mockResolvedValue({
      id: 'old',
      title: 'Old Title',
      markdown: 'Old Content'
    });

    mockRoute.path = '/old';
    mockRoute.params = { id: 'old' };
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/old' });

    wrapper = mount(TestComponent);

    // The article fetch is already in flight while the list is pending.
    expect(api.fetchArticle).toHaveBeenCalledWith('old');

    resolveList({
      ids: ['new', 'old'],
      article_cache: [{ id: 'new', title: 'New Title', markdown: 'New' }]
    });
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('old');
    expect(wrapper.vm.article.title).toBe('Old Title');
    // The early fetch was consumed, not duplicated.
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);
  });

  it('renders a deep-linked article without waiting for the list to resolve', async () => {
    api.fetchArticleTitles.mockReturnValue(new Promise(() => {})); // titles still in flight
    api.fetchArticleList.mockReturnValue(new Promise(() => {})); // full list still in flight
    api.fetchArticle.mockResolvedValue({
      id: 'deep',
      title: 'Deep Title',
      markdown: 'Deep Content'
    });

    mockRoute.path = '/deep';
    mockRoute.params = { id: 'deep' };
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/deep' });

    wrapper = mount(TestComponent);
    await flushPromises();

    // The article is on screen even though neither list response
    // has resolved yet.
    expect(wrapper.vm.article.id).toBe('deep');
    expect(wrapper.vm.article.title).toBe('Deep Title');
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);
    expect(api.fetchArticle).toHaveBeenCalledWith('deep');

    // Restore the automock defaults so the never-resolving list
    // mocks cannot leak into later tests.
    api.fetchArticleTitles.mockReset();
    api.fetchArticleList.mockReset();
  });

  it('falls back to the list when the deep-linked article fetch fails', async () => {
    api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));
    api.fetchArticleList.mockResolvedValue({
      ids: ['9', '1', '2'],
      article_cache: []
    });
    api.fetchArticle.mockRejectedValue(new Error('Fetch Error'));

    mockRoute.path = '/gone';
    mockRoute.params = { id: 'gone' };

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'post',
      params: { id: '9' }
    });
  });

  it('persists the fetched list for the next visit', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: [{ id: '1', title: 'Title 1', markdown: 'Content 1' }]
    });
    api.fetchArticle.mockResolvedValue({
      id: '1',
      title: 'Title 1',
      markdown: 'Content 1'
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    const stored = JSON.parse(localStorage.getItem('blog:list-cache:v1'));
    expect(stored.ids).toEqual(['1', '2']);
    expect(stored.article_cache).toHaveLength(1);
  });

  it('renders from the persisted list immediately and refreshes in the background', async () => {
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({
        ids: ['1', '2'],
        article_cache: [
          { id: '1', title: 'Stored Title', markdown: 'Stored Content' }
        ]
      })
    );
    let resolveTitles;
    api.fetchArticleTitles.mockReturnValue(
      new Promise((resolve) => {
        resolveTitles = resolve;
      })
    );
    api.fetchArticle.mockImplementation(async (id) => ({
      id,
      title: `Title ${id}`,
      markdown: `Content ${id}`
    }));

    wrapper = mount(TestComponent);
    await flushPromises();

    // Rendered from storage without waiting for the network list, while a
    // background refresh is in flight. The refresh comes from the titles
    // response now; the full list is never fetched.
    expect(wrapper.vm.article.title).toBe('Stored Title');
    expect(api.fetchArticleTitles).toHaveBeenCalledTimes(1);
    expect(api.fetchArticleList).not.toHaveBeenCalled();

    resolveTitles({
      ids: ['1', '2'],
      titles: { 1: 'Stored Title', 2: 'Title 2' }
    });
    await flushPromises();

    // The refresh carries no article bodies, so the displayed article
    // keeps the stored body; the persisted list is rewritten in the
    // light shape (no bodies) for the next visit.
    expect(wrapper.vm.article.title).toBe('Stored Title');
    const stored = JSON.parse(localStorage.getItem('blog:list-cache:v1'));
    expect(stored.ids).toEqual(['1', '2']);
    expect(stored.article_cache).toEqual([]);

    // Leave the titles mock rejecting for the tests below (see the
    // note on mock implementations surviving vi.clearAllMocks).
    api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));
  });

  it('ignores a corrupt persisted list and loads from the network', async () => {
    localStorage.setItem('blog:list-cache:v1', 'not-json');
    api.fetchArticleList.mockResolvedValue({ ids: ['1'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({
      id: '1',
      title: 'Title 1',
      markdown: 'Content 1'
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');
    expect(wrapper.vm.article.title).toBe('Title 1');
  });

  it('fetches the fresh list when a deep-linked id is missing from the persisted list', async () => {
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({
        ids: ['1', '2'],
        article_cache: [
          { id: '1', title: 'Stored Title', markdown: 'Stored Content' }
        ]
      })
    );
    api.fetchArticleList.mockResolvedValue({
      ids: ['3', '1', '2'],
      article_cache: []
    });
    api.fetchArticle.mockImplementation(async (id) => ({
      id,
      title: `Title ${id}`,
      markdown: `Content ${id}`
    }));

    mockRoute.path = '/3';
    mockRoute.params = { id: '3' };

    wrapper = mount(TestComponent);
    await flushPromises();

    // The requested article wins over the stale list's newest entry.
    expect(wrapper.vm.article.id).toBe('3');
    expect(wrapper.vm.article.title).toBe('Title 3');
    expect(mockRouter.replace).not.toHaveBeenCalledWith({
      name: 'post',
      params: { id: '1' }
    });
  });

  it('falls back to the fresh newest article when the id is in neither list', async () => {
    localStorage.setItem(
      'blog:list-cache:v1',
      JSON.stringify({ ids: ['1', '2'], article_cache: [] })
    );
    // The fresh list comes from the titles response now.
    api.fetchArticleTitles.mockResolvedValue({
      ids: ['9', '1', '2'],
      titles: { 9: 'Title 9', 1: 'Title 1', 2: 'Title 2' }
    });
    // The API answers a document outside the blog folder with an
    // error payload rather than a failed request, so a gone article
    // never displays and the list-based fallback decides instead.
    api.fetchArticle.mockImplementation(async (id) =>
      id === 'gone'
        ? { error: 'Document not found' }
        : { id, title: `Title ${id}`, markdown: `Content ${id}` }
    );

    mockRoute.path = '/gone';
    mockRoute.params = { id: 'gone' };

    wrapper = mount(TestComponent);
    await flushPromises();

    // The fallback target is the fresh list's first article, not the
    // stale persisted list's.
    expect(mockRouter.replace).toHaveBeenCalledWith({
      name: 'post',
      params: { id: '9' }
    });

    // Leave the titles mock rejecting for the tests below (see the
    // note on mock implementations surviving vi.clearAllMocks).
    api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));
  });

  it('loads a former special article as a normal article', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58', replace });
    api.fetchArticleList.mockResolvedValue({
      ids: ['1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58'],
      article_cache: []
    });
    api.fetchArticle.mockResolvedValue({
      id: '1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58',
      title: 'Map article',
      markdown: '# Map'
    });

    mockRoute.path = '/1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58';
    mockRoute.params = { id: '1bNigXcTT-1LSXjUYAlfFQuJPX6U7U3ELeWAfG5XIb58' };

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe('Map article');
  });

  it('does not redirect ordinary articles', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1', replace });
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    mockRoute.path = '/1';
    mockRoute.params = { id: '1' };

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(replace).not.toHaveBeenCalled();
    expect(wrapper.vm.article.title).toBe('Title 1');
  });

  it('survives null and undefined entries in the full list article_cache', async () => {
    api.fetchArticleTitles.mockRejectedValue(new Error('titles unavailable'));
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      titles: { 1: 'Title 1', 2: 'Title 2' },
      article_cache: [null, { id: '2', title: 'Title 2', markdown: '# Content 2' }, undefined]
    });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: '# Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    // One malformed cache entry must not fail the whole list: the
    // article still loads, with no error message.
    expect(wrapper.vm.errorMessage).toBe('');
    expect(wrapper.vm.article.title).toBe('Title 1');
    expect(wrapper.vm.articleIds).toEqual(['1', '2']);
    // The valid cache entry was adopted, so article 2 is never
    // fetched (the prefetch finds it already cached).
    expect(api.fetchArticle.mock.calls.map((call) => call[0])).toEqual(['1']);
  });

  describe('translated routes', () => {
    afterEach(() => {
      applyRouteLang(null);
      routeLang.value = null;
      mockRoute.name = undefined;
    });

    it('fetches the article and titles with the route language, never the Japanese full list', async () => {
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2'],
        titles: { 1: 'Title 1 EN', 2: 'Title 2 EN' }
      });
      api.fetchArticle.mockImplementation(async (id, lang) => ({
        id,
        title: `Title ${id} ${lang}`,
        markdown: `# Content ${id} ${lang}`
      }));

      applyRouteLang('en');
      mockRoute.path = '/en/2';
      mockRoute.params = { lang: 'en', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/en/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(api.fetchArticle).toHaveBeenCalledWith('2', 'en');
      expect(api.fetchArticleTitles).toHaveBeenCalledWith('en');
      expect(api.fetchArticleList).not.toHaveBeenCalled();
      expect(wrapper.vm.article.title).toBe('Title 2 en');
      // Navigation links stay inside the language.
      expect(wrapper.vm.prevLink).toBe('/en/1');
      expect(wrapper.vm.nextLink).toBe('');
    });

    it('keeps the per-language session caches apart for the same article', async () => {
      api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
      api.fetchArticleTitles.mockResolvedValue({ ids: ['1', '2'], titles: {} });
      api.fetchArticle.mockImplementation(async (id, lang) => ({
        id,
        title: lang ? `Title ${id} EN` : `Title ${id} JA`,
        markdown: 'Content'
      }));

      mockRoute.path = '/1';
      mockRoute.params = { id: '1' };
      wrapper = mount(TestComponent);
      await flushPromises();
      expect(wrapper.vm.article.title).toBe('Title 1 JA');
      expect(api.fetchArticle).toHaveBeenCalledWith('1');
      expect(api.fetchArticle).not.toHaveBeenCalledWith('1', 'en');

      // Same article, English URL: the Japanese cache entry must
      // not be served; the translated article is fetched instead.
      applyRouteLang('en');
      mockRoute.path = '/en/1';
      mockRoute.params = { lang: 'en', id: '1' };
      await flushPromises();
      expect(api.fetchArticle).toHaveBeenCalledWith('1', 'en');
      expect(wrapper.vm.article.title).toBe('Title 1 EN');

      // Back to Japanese: the original entry is still cached, so
      // no second Japanese fetch happens.
      applyRouteLang(null);
      mockRoute.path = '/1';
      mockRoute.params = { id: '1' };
      await flushPromises();
      expect(wrapper.vm.article.title).toBe('Title 1 JA');
      expect(api.fetchArticle.mock.calls.filter((args) => args.length === 1 && args[0] === '1')).toHaveLength(1);
    });

    it('redirects the translated root to the newest article in the same language', async () => {
      api.fetchArticleTitles.mockResolvedValue({ ids: ['first-id', 'second-id'], titles: {} });
      api.fetchArticle.mockResolvedValue({ id: 'first-id', title: 'Title EN', markdown: 'Content' });

      applyRouteLang('en');
      mockRoute.name = 'lang-home';
      mockRoute.path = '/en';
      mockRoute.params = { lang: 'en' };

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(mockRouter.replace).toHaveBeenCalledWith({
        name: 'post',
        params: { lang: 'en', id: 'first-id' }
      });
    });

    it('surfaces a titles failure on a translated page instead of falling back to the Japanese list', async () => {
      api.fetchArticleTitles.mockRejectedValue(new Error('Titles Error'));

      applyRouteLang('zh');
      mockRoute.name = 'lang-home';
      mockRoute.path = '/zh';
      mockRoute.params = { lang: 'zh' };

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(api.fetchArticleList).not.toHaveBeenCalled();
      expect(wrapper.vm.errorMessage).toBe('Titles Error');
    });
  });

  describe('navigation titles from the list payload', () => {
    afterEach(() => {
      applyRouteLang(null);
      routeLang.value = null;
      mockRoute.name = undefined;
    });

    it('takes prev/next titles from the Japanese titles payload', async () => {
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 1: 'タイトル1', 2: 'タイトル2', 3: 'タイトル3' }
      });
      api.fetchArticleList.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 1: 'タイトル1', 2: 'タイトル2', 3: 'タイトル3' },
        article_cache: []
      });
      // The fetched articles carry different titles than the payload
      // map, so the assertions can only pass if the map is the source.
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: `記事${id}`,
        markdown: 'Content'
      }));

      mockRoute.path = '/2';
      mockRoute.params = { id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.article.id).toBe('2');
      expect(wrapper.vm.prevTitle).toBe('タイトル1');
      expect(wrapper.vm.nextTitle).toBe('タイトル3');
    });

    it('shows English prev/next titles from the en titles payload on an English page', async () => {
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 1: 'Title 1 EN', 2: 'Title 2 EN', 3: 'Title 3 EN' }
      });
      // The article endpoint answers the neighbours with their
      // Japanese originals (its fallback for articles it cannot
      // translate); the navigation must still speak the page's
      // language, from the titles payload.
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: id === '2' ? 'Title 2 EN' : `Title ${id} JA`,
        markdown: 'Content'
      }));

      applyRouteLang('en');
      mockRoute.path = '/en/2';
      mockRoute.params = { lang: 'en', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/en/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.article.title).toBe('Title 2 EN');
      expect(wrapper.vm.prevTitle).toBe('Title 1 EN');
      expect(wrapper.vm.nextTitle).toBe('Title 3 EN');
    });

    it('shows Chinese prev/next titles from the zh titles payload on a Chinese page', async () => {
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 1: '标题1', 2: '标题2', 3: '标题3' }
      });
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: id === '2' ? '标题2' : `Title ${id} JA`,
        markdown: 'Content'
      }));

      applyRouteLang('zh');
      mockRoute.path = '/zh/2';
      mockRoute.params = { lang: 'zh', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/zh/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.article.title).toBe('标题2');
      expect(wrapper.vm.prevTitle).toBe('标题1');
      expect(wrapper.vm.nextTitle).toBe('标题3');
    });

    it('falls back to the cached article title when the titles payload lacks the neighbour', async () => {
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 2: 'Title 2 EN' }
      });
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: `Title ${id} EN`,
        markdown: 'Content'
      }));

      applyRouteLang('en');
      mockRoute.path = '/en/2';
      mockRoute.params = { lang: 'en', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/en/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      // Neither neighbour is in the titles map; their titles arrive
      // with the prefetched articles instead.
      expect(wrapper.vm.prevTitle).toBe('Title 1 EN');
      expect(wrapper.vm.nextTitle).toBe('Title 3 EN');
    });

    it('replaces the titles map when the list language changes', async () => {
      api.fetchArticleTitles.mockImplementation(async (lang) =>
        (lang === 'en'
          ? { ids: ['1', '2', '3'], titles: { 1: 'Title 1 EN', 2: 'Title 2 EN', 3: 'Title 3 EN' } }
          : { ids: ['1', '2', '3'], titles: { 1: 'タイトル1', 2: 'タイトル2', 3: 'タイトル3' } }));
      api.fetchArticleList.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: { 1: 'タイトル1', 2: 'タイトル2', 3: 'タイトル3' },
        article_cache: []
      });
      // Neighbour articles always come back with Japanese titles, so
      // neither the article cache nor a stale Japanese map can
      // produce the English assertions below.
      api.fetchArticle.mockImplementation(async (id, lang) => ({
        id,
        title: id === '2'
          ? (lang === 'en' ? 'Title 2 EN' : 'タイトル2')
          : `Title ${id} JA`,
        markdown: 'Content'
      }));

      mockRoute.path = '/2';
      mockRoute.params = { id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.prevTitle).toBe('タイトル1');
      expect(wrapper.vm.nextTitle).toBe('タイトル3');

      applyRouteLang('en');
      mockRoute.path = '/en/2';
      mockRoute.params = { lang: 'en', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/en/2' });
      await flushPromises();

      expect(wrapper.vm.article.title).toBe('Title 2 EN');
      expect(wrapper.vm.prevTitle).toBe('Title 1 EN');
      expect(wrapper.vm.nextTitle).toBe('Title 3 EN');
    });

    it('primes the titles map from the persisted list', async () => {
      localStorage.setItem('blog:list-cache:v1:en', JSON.stringify({
        ids: ['1', '2', '3'],
        titles: { 1: 'Title 1 EN', 2: 'Title 2 EN', 3: 'Title 3 EN' },
        article_cache: []
      }));
      // The network list never lands, so only the persisted list can
      // be feeding the navigation titles.
      api.fetchArticleTitles.mockReturnValue(new Promise(() => {}));
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: id === '2' ? 'Title 2 EN' : `Title ${id} JA`,
        markdown: 'Content'
      }));

      applyRouteLang('en');
      mockRoute.path = '/en/2';
      mockRoute.params = { lang: 'en', id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/en/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.article.title).toBe('Title 2 EN');
      expect(wrapper.vm.prevTitle).toBe('Title 1 EN');
      expect(wrapper.vm.nextTitle).toBe('Title 3 EN');
    });

    it('ignores titles delivered as an array and falls back to the article cache', async () => {
      // A payload shape that reached production: titles as a
      // positional array instead of the id -> title map. Read as a
      // map it would hand article 1 the title 'X2', so the array
      // must be ignored wholesale; navigation titles then come
      // from the fetched articles themselves.
      api.fetchArticleTitles.mockResolvedValue({
        ids: ['1', '2', '3'],
        titles: ['X1', 'X2', 'X3']
      });
      // The background full-list refresh never lands, so only the
      // titles response can feed the navigation titles.
      api.fetchArticleList.mockReturnValue(new Promise(() => {}));
      api.fetchArticle.mockImplementation(async (id) => ({
        id,
        title: `記事${id}`,
        markdown: 'Content'
      }));

      mockRoute.path = '/2';
      mockRoute.params = { id: '2' };
      vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });

      wrapper = mount(TestComponent);
      await flushPromises();

      expect(wrapper.vm.article.title).toBe('記事2');
      expect(wrapper.vm.prevTitle).toBe('記事1');
      expect(wrapper.vm.nextTitle).toBe('記事3');
    });
  });
});
