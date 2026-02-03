import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useBlog } from '../../src/composables/useBlog';
import { flushPromises, mount } from '@vue/test-utils';
import * as api from '../../src/services/api';
import { defineComponent, reactive } from 'vue';

vi.mock('../../src/services/api');

let mockRoute = reactive({ path: '/blog' });
let routeToReturn = mockRoute;
vi.mock('vue-router', () => ({
  useRoute: () => routeToReturn,
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
    mockRoute.path = '/blog';
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
    expect(wrapper.vm.articleHtml).toContain('<h1>Content 1</h1>');
    expect(document.title).toBe('Title 1');
  });

  it('handles error on mount', async () => {
    api.fetchArticleList.mockRejectedValue(new Error('List Error'));

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('List Error');
  });

  it('handles route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.id).toBe('1');

    // Simulate route change
    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    api.fetchArticle.mockResolvedValue({ id: '2', title: 'Title 2', markdown: 'Content 2' });

    await flushPromises();

    expect(wrapper.vm.article.id).toBe('2');
  });

  it('handles error on route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    api.fetchArticle.mockRejectedValue(new Error('Fetch Error'));

    await flushPromises();

    expect(wrapper.vm.errorMessage).toBe('Fetch Error');
  });

  it('handles error without message on route change', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    mockRoute.path = '/2';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/2' });
    api.fetchArticle.mockRejectedValue({}); // No message

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
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);

    // Trigger watcher with same path (should not happen in real app as path would change,
    // but testing the loadArticleFromLocation internal check)
    mockRoute.path = '/blog';
    await flushPromises();
    // Should still be 1 because currentId is same
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);
  });

  it('does not reload if same article id via different path', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    // Start at /1
    mockRoute.path = '/1';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog/1' });

    wrapper = mount(TestComponent);
    await flushPromises();
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);

    // Change to /blog (which resolves to '1')
    mockRoute.path = '/blog';
    vi.stubGlobal('location', { ...window.location, pathname: '/blog' });
    await flushPromises();

    // Should still be 1
    expect(api.fetchArticle).toHaveBeenCalledTimes(1);
  });

  it('uses article_cache if available', async () => {
    const cachedArticle = { id: '1', title: 'Cached Title', markdown: 'Cached Content' };
    api.fetchArticleList.mockResolvedValue({
      ids: ['1', '2'],
      article_cache: [cachedArticle]
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.article.title).toBe('Cached Title');
    expect(api.fetchArticle).not.toHaveBeenCalled();
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

  it('rewrites links in markdown to /blog/ if they point to the first article', async () => {
    api.fetchArticleList.mockResolvedValue({
      ids: ['first', 'second'],
      article_cache: []
    });
    api.fetchArticle.mockResolvedValue({
      id: 'second',
      title: 'Title 2',
      markdown: 'Check [first article](/blog/first) or [same with slash](/blog/first/). Also [other](/blog/other).'
    });

    wrapper = mount(TestComponent);
    await flushPromises();

    expect(wrapper.vm.articleHtml).toContain('href="/blog/"');
    expect(wrapper.vm.articleHtml).toContain('Check <a href="/blog/">first article</a>');
    expect(wrapper.vm.articleHtml).toContain('<a href="/blog/">same with slash</a>');
    expect(wrapper.vm.articleHtml).toContain('<a href="/blog/other">other</a>');
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
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    // Trigger watcher error
    api.fetchArticle.mockRejectedValue(new Error('Watch Error'));
    mockRoute.path = '/2';
    // Watcher is triggered by mockRoute.path change because it's reactive

    await flushPromises();
    expect(wrapper.vm.errorMessage).toBe('Watch Error');
  });

  it('handles error without message in watcher', async () => {
    api.fetchArticleList.mockResolvedValue({ ids: ['1', '2'], article_cache: [] });
    api.fetchArticle.mockResolvedValue({ id: '1', title: 'Title 1', markdown: 'Content 1' });

    wrapper = mount(TestComponent);
    await flushPromises();

    api.fetchArticle.mockRejectedValue({});
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
});
