import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NavigationLinks from '../../src/components/NavigationLinks.vue';

describe('NavigationLinks', () => {
  it('renders nothing when no links are provided', () => {
    const wrapper = mount(NavigationLinks);
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('renders links when provided', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        nextLink: '/next'
      }
    });
    expect(wrapper.find('nav').exists()).toBe(true);
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(2);
    expect(links[0].text()).toBe('前の記事');
    expect(links[0].attributes('href')).toBe('/prev');
    expect(links[1].text()).toBe('次の記事');
    expect(links[1].attributes('href')).toBe('/next');
  });

  it('applies top class when top prop is true', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        top: true
      }
    });
    expect(wrapper.find('nav').classes()).toContain('navigation-top');
  });

  it('renders only one link when only one is provided', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        nextLink: '/next'
      }
    });
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].text()).toBe('次の記事');
  });
});
