import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TagChips from '../../src/components/TagChips.vue';
import TagIndex from '../../src/components/TagIndex.vue';

const mountWithStub = (component, props) =>
  mount(component, {
    props,
    global: { stubs: { RouterLink: RouterLinkStub } }
  });

describe('TagChips', () => {
  it('renders one chip per tag, each linking to its tag page', () => {
    const wrapper = mountWithStub(TagChips, { tags: ['運営', '技術'] });
    const chips = wrapper.findAll('.tag-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].text()).toBe('運営');
    expect(chips[1].text()).toBe('技術');
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props().to).toBe(`/tag/${encodeURIComponent('運営')}`);
    expect(links[1].props().to).toBe(`/tag/${encodeURIComponent('技術')}`);
  });

  it('renders nothing when there are no tags', () => {
    const wrapper = mountWithStub(TagChips, { tags: [] });
    expect(wrapper.find('.tag-chips').exists()).toBe(false);
  });

  it('renders nothing when the tags prop is omitted (payloads without tags)', () => {
    const wrapper = mountWithStub(TagChips, {});
    expect(wrapper.find('.tag-chips').exists()).toBe(false);
  });
});

describe('TagIndex', () => {
  it('renders tags with their article counts, linking to tag pages', () => {
    const wrapper = mountWithStub(TagIndex, {
      tags: [
        { tag: '運営', count: 4 },
        { tag: '中国語', count: 2 }
      ]
    });
    const chips = wrapper.findAll('.tag-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0].text()).toContain('運営');
    expect(chips[0].find('.tag-chip-count').text()).toBe('4');
    expect(chips[1].text()).toContain('中国語');
    expect(chips[1].find('.tag-chip-count').text()).toBe('2');
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links[0].props().to).toBe(`/tag/${encodeURIComponent('運営')}`);
    expect(links[1].props().to).toBe(`/tag/${encodeURIComponent('中国語')}`);
  });

  it('renders nothing when no tag exists yet', () => {
    const wrapper = mountWithStub(TagIndex, { tags: [] });
    expect(wrapper.find('.tag-index').exists()).toBe(false);
  });
});
