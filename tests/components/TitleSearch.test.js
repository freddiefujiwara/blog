import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TitleSearch from '../../src/components/TitleSearch.vue';

const articles = [
  { id: 'a3', title: '2026-11-03 全持ち物リスト、大公開！！' },
  { id: 'a2', title: '2026-11-02 AI「Muse」を1週間使い倒したら' },
  { id: 'a1', title: '2026-11-01 サーバー代ゼロ。お金をかけないホームページとブログの続け方' }
];

const mountSearch = () =>
  mount(TitleSearch, {
    props: { articles },
    global: { stubs: { RouterLink: RouterLinkStub } }
  });

describe('TitleSearch', () => {
  it('shows no results before anything is typed', () => {
    const wrapper = mountSearch();
    expect(wrapper.find('.title-search-results').exists()).toBe(false);
  });

  it('lists articles whose title contains the query, newest first', async () => {
    const wrapper = mountSearch();
    await wrapper.find('input').setValue('ブログ');
    const links = wrapper.findAll('.title-search-item a');
    expect(links).toHaveLength(1);
    expect(links[0].text()).toContain('サーバー代ゼロ');
  });

  it('matches a partial word anywhere in the title', async () => {
    const wrapper = mountSearch();
    await wrapper.find('input').setValue('リスト');
    const links = wrapper.findAll('.title-search-item a');
    expect(links).toHaveLength(1);
    expect(links[0].text()).toContain('全持ち物リスト');
  });

  it('shows a no-match message when nothing fits', async () => {
    const wrapper = mountSearch();
    await wrapper.find('input').setValue('存在しない言葉');
    expect(wrapper.find('.title-search-empty').text()).toBe('該当する記事がありません');
  });

  it('links each result to its article', async () => {
    const wrapper = mountSearch();
    await wrapper.find('input').setValue('Muse');
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props('to')).toBe('/a2');
  });
});
