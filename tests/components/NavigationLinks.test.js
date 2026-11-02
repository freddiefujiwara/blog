import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NavigationLinks from '../../src/components/NavigationLinks.vue';

const routerLinkStub = { template: '<a :href="$attrs.to"><slot /></a>' };

describe('NavigationLinks', () => {
  it('renders nothing when no links are provided', () => {
    const wrapper = mount(NavigationLinks, {
      global: {
        stubs: { RouterLink: true }
      }
    });
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('renders text links with labels and full titles when provided', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        prevTitle: 'Previous Article Title',
        nextLink: '/next',
        nextTitle: 'Next'
      },
      global: {
        stubs: { RouterLink: routerLinkStub }
      }
    });
    expect(wrapper.find('nav').exists()).toBe(true);
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(2);
    expect(links[0].classes()).toContain('nav-link');
    expect(links[0].classes()).toContain('nav-prev');
    expect(links[0].find('.nav-label').text()).toBe('前の記事');
    // Titles are shown in full (no truncation); wrapping is left to CSS.
    expect(links[0].find('.nav-title').text()).toBe('Previous Article Title');
    expect(links[0].attributes('href')).toBe('/prev');
    expect(links[1].classes()).toContain('nav-next');
    expect(links[1].find('.nav-label').text()).toBe('次の記事');
    expect(links[1].find('.nav-title').text()).toBe('Next');
    expect(links[1].attributes('href')).toBe('/next');
  });

  it('renders labels only when titles are missing', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        nextLink: '/next',
        prevTitle: '',
        nextTitle: ''
      },
      global: {
        stubs: { RouterLink: routerLinkStub }
      }
    });
    const links = wrapper.findAll('a');
    expect(links[0].find('.nav-label').text()).toBe('前の記事');
    expect(links[0].find('.nav-title').exists()).toBe(false);
    expect(links[1].find('.nav-label').text()).toBe('次の記事');
    expect(links[1].find('.nav-title').exists()).toBe(false);
  });

  it('renders a long title in full without truncation markers', () => {
    const longTitle = 'This is a very long title for the next article';
    const wrapper = mount(NavigationLinks, {
      props: {
        nextLink: '/next',
        nextTitle: longTitle
      },
      global: {
        stubs: { RouterLink: routerLinkStub }
      }
    });
    expect(wrapper.find('.nav-title').text()).toBe(longTitle);
    expect(wrapper.find('a').text()).not.toContain('…');
    expect(wrapper.find('a').text()).not.toContain('>>');
  });

  it('applies top class when top prop is true', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        top: true
      },
      global: {
        stubs: { RouterLink: true }
      }
    });
    expect(wrapper.find('nav').classes()).toContain('navigation-top');
  });

  it('renders only one link when only one is provided', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        nextLink: '/next',
        nextTitle: 'Next'
      },
      global: {
        stubs: { RouterLink: routerLinkStub }
      }
    });
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].classes()).toContain('nav-next');
    expect(links[0].find('.nav-title').text()).toBe('Next');
  });
});
