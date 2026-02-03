import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import NavigationLinks from '../../src/components/NavigationLinks.vue';

describe('NavigationLinks', () => {
  it('renders nothing when no links are provided', () => {
    const wrapper = mount(NavigationLinks, {
      global: {
        stubs: { RouterLink: true }
      }
    });
    expect(wrapper.find('nav').exists()).toBe(false);
  });

  it('renders links with formatted titles when provided', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        prevTitle: 'Previous Article Title',
        nextLink: '/next',
        nextTitle: 'Next'
      },
      global: {
        stubs: { RouterLink: { template: '<a :href="$attrs.to"><slot /></a>' } }
      }
    });
    expect(wrapper.find('nav').exists()).toBe(true);
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(2);
    // Previous: 16 chars of "Previous Article Title" is "Previous Article"
    expect(links[0].text()).toBe('<<Previous Article…');
    expect(links[0].attributes('href')).toBe('/prev');
    // Next: "Next" is short
    expect(links[1].text()).toBe('Next>>');
    expect(links[1].attributes('href')).toBe('/next');
  });

  it('renders fallback text when titles are missing', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        nextLink: '/next',
        prevTitle: '',
        nextTitle: ''
      },
      global: {
        stubs: { RouterLink: { template: '<a :href="$attrs.to"><slot /></a>' } }
      }
    });
    const links = wrapper.findAll('a');
    expect(links[0].text()).toBe('前の記事');
    expect(links[1].text()).toBe('次の記事');
  });

  it('handles exactly 16 characters in title', () => {
    const sixteenChars = '1234567890123456';
    const wrapper = mount(NavigationLinks, {
      props: {
        prevLink: '/prev',
        prevTitle: sixteenChars,
        nextLink: '/next',
        nextTitle: sixteenChars
      },
      global: {
        stubs: { RouterLink: { template: '<a :href="$attrs.to"><slot /></a>' } }
      }
    });
    const links = wrapper.findAll('a');
    expect(links[0].text()).toBe('<<' + sixteenChars);
    expect(links[1].text()).toBe(sixteenChars + '>>');
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
        stubs: { RouterLink: { template: '<a :href="$attrs.to"><slot /></a>' } }
      }
    });
    const links = wrapper.findAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].text()).toBe('Next>>');
  });

  it('renders long next title with truncation', () => {
    const wrapper = mount(NavigationLinks, {
      props: {
        nextLink: '/next',
        nextTitle: 'This is a very long title for the next article'
      },
      global: {
        stubs: { RouterLink: { template: '<a :href="$attrs.to"><slot /></a>' } }
      }
    });
    expect(wrapper.find('a').text()).toBe('This is a very l…>>');
  });
});
