import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ArticleContent from '../../src/components/ArticleContent.vue';

describe('ArticleContent', () => {
  it('renders nothing when no article is provided', () => {
    const wrapper = mount(ArticleContent);
    expect(wrapper.find('div').exists()).toBe(false);
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
    expect(wrapper.find('article').html()).toContain('<p>Test Content</p>');
  });
});
