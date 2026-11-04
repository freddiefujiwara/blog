import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TableOfContents from '../../src/components/TableOfContents.vue';

const entries = [
  { level: 2, id: 'h-11111111', text: '最初の見出し' },
  { level: 3, id: 'h-22222222', text: '小見出し' },
  { level: 2, id: 'h-33333333', text: '次の見出し' }
];

describe('TableOfContents', () => {
  it('renders nothing with fewer than three entries', () => {
    const wrapper = mount(TableOfContents, { props: { entries: entries.slice(0, 2) } });
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('renders nothing without entries', () => {
    const wrapper = mount(TableOfContents);
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('links each entry to its heading anchor', () => {
    const wrapper = mount(TableOfContents, { props: { entries } });
    const links = wrapper.findAll('.toc-item a');
    expect(links).toHaveLength(3);
    expect(links[0].attributes('href')).toBe('#h-11111111');
    expect(links[0].text()).toBe('最初の見出し');
    expect(links[2].attributes('href')).toBe('#h-33333333');
  });

  it('indents level 3 entries', () => {
    const wrapper = mount(TableOfContents, { props: { entries } });
    const items = wrapper.findAll('.toc-item');
    expect(items[0].classes()).not.toContain('toc-item-sub');
    expect(items[1].classes()).toContain('toc-item-sub');
  });
});
