import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TagView from '../../src/pages/TagView.vue';
import * as api from '../../src/services/api';

vi.mock('../../src/services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchArticleTitles: vi.fn() };
});

const payload = {
  ids: ['a3', 'a2', 'a1'],
  titles: {
    a3: '2026-11-07 運用費の記事',
    a2: '2026-11-04 テストの記事',
    a1: '2026-10-24 中国語レッスンの記事'
  },
  tags: {
    a3: ['運営'],
    a2: ['運営', '技術'],
    a1: ['中国語']
  }
};

const mountTag = (tag) =>
  mount(TagView, {
    props: { tag },
    global: { stubs: { RouterLink: RouterLinkStub } }
  });

describe('TagView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.fetchArticleTitles.mockResolvedValue(payload);
  });

  it('lists only the articles carrying the tag, newest first', async () => {
    const wrapper = mountTag('運営');
    await flushPromises();
    expect(wrapper.find('.tag-page-heading').text()).toContain('運営');
    const items = wrapper.findAll('.tag-article-item a');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toBe('2026-11-07 運用費の記事');
    expect(items[1].text()).toBe('2026-11-04 テストの記事');
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props().to).toBe('/a3');
    expect(links[1].props().to).toBe('/a2');
  });

  it('shows an empty message for a tag no article carries', async () => {
    const wrapper = mountTag('音楽');
    await flushPromises();
    expect(wrapper.findAll('.tag-article-item')).toHaveLength(0);
    expect(wrapper.find('.tag-page-status').text()).toContain('まだありません');
  });

  it('stays graceful when the payload has no tags at all (older API)', async () => {
    api.fetchArticleTitles.mockResolvedValue({
      ids: payload.ids,
      titles: payload.titles
    });
    const wrapper = mountTag('運営');
    await flushPromises();
    expect(wrapper.findAll('.tag-article-item')).toHaveLength(0);
    expect(wrapper.find('.tag-page-status').text()).toContain('まだありません');
  });

  it('reports the failure when the fetch fails and nothing is cached', async () => {
    api.fetchArticleTitles.mockRejectedValue(new Error('boom'));
    const wrapper = mountTag('運営');
    await flushPromises();
    expect(wrapper.find('.tag-page-status').text()).toContain('失敗しました');
  });
});
