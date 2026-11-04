import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ShareLinks from '../../src/components/ShareLinks.vue';

const props = {
  title: 'テスト記事',
  url: 'https://freddiefujiwara.com/blog/abc123'
};

describe('ShareLinks', () => {
  it('見出しと4つのシェアリンクを新しいタブで開く形で描く', () => {
    const wrapper = mount(ShareLinks, { props });
    expect(wrapper.find('.share-heading').text()).toBe('この記事をシェアする');
    const links = wrapper.findAll('a.share-pill');
    expect(links).toHaveLength(4);
    expect(links.map((l) => l.text())).toEqual(['X', 'Facebook', 'LINE', 'Threads']);
    links.forEach((link) => {
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toContain('noopener');
      expect(link.attributes('href')).toContain('freddiefujiwara.com%2Fblog%2Fabc123');
    });
  });

  it('コピーボタンで記事URLをコピーしてラベルが変わる', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });
    const wrapper = mount(ShareLinks, { props });
    const button = wrapper.find('button.share-copy');
    expect(button.text()).toContain('リンクをコピー');
    await button.trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('https://freddiefujiwara.com/blog/abc123');
    expect(button.text()).toContain('コピーしました');
  });
});
