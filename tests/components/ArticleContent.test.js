import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ArticleContent from '../../src/components/ArticleContent.vue';

describe('ArticleContent', () => {
  it('renders nothing when no article is provided', () => {
    const wrapper = mount(ArticleContent);
    expect(wrapper.find('article').exists()).toBe(false);
  });

  it('renders title and content when article is provided', () => {
    const article = { title: 'Test Title' };
    const articleHtml = '<p>Test Content</p>';
    const wrapper = mount(ArticleContent, {
      props: {
        article,
        articleHtml
      }
    });
    expect(wrapper.find('h1').text()).toBe('Test Title');
    expect(wrapper.find('div').html()).toContain('<p>Test Content</p>');
  });

  const toc = [
    { level: 2, id: 'h-aaaaaaaa', text: 'One' },
    { level: 2, id: 'h-bbbbbbbb', text: 'Two' },
    { level: 2, id: 'h-cccccccc', text: 'Three' }
  ];

  it('places the TOC at the [[目次]] marker and removes the marker', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p>Intro</p><p>[[目次]]</p><p>Body</p>',
        toc
      },
      global: { stubs: { RouterLink: true } }
    });
    const html = wrapper.html();
    expect(html).not.toContain('[[目次]]');
    expect(html.indexOf('<p>Intro</p>')).toBeLessThan(html.indexOf('table-of-contents'));
    expect(html.indexOf('table-of-contents')).toBeLessThan(html.indexOf('<p>Body</p>'));
  });

  it('renders no TOC box and no marker remnant when the marker is present but there are too few headings', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p>Intro</p><p>[[目次]]</p><p>Body</p>',
        toc: [{ level: 2, id: 'h-aaaaaaaa', text: 'One' }]
      },
      global: { stubs: { RouterLink: true } }
    });
    const html = wrapper.html();
    expect(wrapper.find('.table-of-contents').exists()).toBe(false);
    expect(html).not.toContain('[[目次]]');
    expect(html.indexOf('<p>Intro</p>')).toBeLessThan(html.indexOf('<p>Body</p>'));
  });

  it('renders no TOC box when the marker is present and the article has no headings at all', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p>Intro</p><p>[[目次]]</p><p>Body</p>',
        toc: []
      },
      global: { stubs: { RouterLink: true } }
    });
    expect(wrapper.find('.table-of-contents').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('[[目次]]');
    expect(wrapper.html()).toContain('<p>Body</p>');
  });

  it('keeps the TOC under the title when there is no marker', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p>Intro</p><p>Body</p>',
        toc
      },
      global: { stubs: { RouterLink: true } }
    });
    const html = wrapper.html();
    expect(html.indexOf('table-of-contents')).toBeLessThan(html.indexOf('<p>Intro</p>'));
  });
});
