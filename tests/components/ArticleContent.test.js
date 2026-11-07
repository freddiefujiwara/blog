import { mount, RouterLinkStub } from '@vue/test-utils';
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

  it('swaps a failed link-card image for the fallback image, once', async () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml:
          '<a class="link-card" href="https://example.com/"><img class="link-card-image" src="https://example.com/dead.jpg" alt=""></a>'
      }
    });
    const img = wrapper.find('img.link-card-image').element;
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe(
      'https://tshop.r10s.jp/rukusu/cabinet/images/junbi.jpg'
    );
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe(
      'https://tshop.r10s.jp/rukusu/cabinet/images/junbi.jpg'
    );
  });

  it('swaps a link-card image that already failed before mount, without an error event', async () => {
    // Simulate an image whose load already finished (and failed)
    // before the component mounted: complete, but zero natural width.
    const proto = window.HTMLImageElement.prototype;
    const completeDesc = Object.getOwnPropertyDescriptor(proto, 'complete');
    const widthDesc = Object.getOwnPropertyDescriptor(proto, 'naturalWidth');
    Object.defineProperty(proto, 'complete', { configurable: true, get: () => true });
    Object.defineProperty(proto, 'naturalWidth', { configurable: true, get: () => 0 });
    try {
      const wrapper = mount(ArticleContent, {
        props: {
          article: { title: 'T' },
          articleHtml:
            '<a class="link-card" href="https://example.com/"><img class="link-card-image" src="https://example.com/dead.jpg" alt=""></a>'
        }
      });
      await wrapper.vm.$nextTick();
      expect(wrapper.find('img.link-card-image').element.getAttribute('src')).toBe(
        'https://tshop.r10s.jp/rukusu/cabinet/images/junbi.jpg'
      );
    } finally {
      if (completeDesc) Object.defineProperty(proto, 'complete', completeDesc);
      if (widthDesc) Object.defineProperty(proto, 'naturalWidth', widthDesc);
    }
  });

  it('leaves non-card images alone when they fail to load', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p><img src="https://example.com/photo.jpg" alt=""></p>'
      }
    });
    const img = wrapper.find('img').element;
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg');
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

  it('renders the whole-article TOC at each marker when there are several', () => {
    const articleHtml =
      '<h2 id="h-11111111">A</h2><p>[[目次]]</p>' +
      '<h3 id="h-22222222">A1</h3>' +
      '<h2 id="h-44444444">B</h2><p>[[目次]]</p>' +
      '<h3 id="h-55555555">B1</h3>';
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml,
        toc
      },
      global: { stubs: { RouterLink: true } }
    });
    const boxes = wrapper.findAll('.table-of-contents');
    expect(boxes).toHaveLength(2);
    // every box carries the full article TOC, unchanged
    expect(boxes[0].text()).toContain('One');
    expect(boxes[0].text()).toContain('Three');
    expect(boxes[1].text()).toContain('One');
    expect(boxes[1].text()).toContain('Three');
    expect(wrapper.html()).not.toContain('[[目次]]');
    const html = wrapper.html();
    expect(html.indexOf('<h2 id="h-11111111">A</h2>')).toBeLessThan(html.indexOf('table-of-contents'));
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

  it('renders tag chips under the title when the article carries tags', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T', tags: ['運営', '技術'] },
        articleHtml: '<p>Body</p>'
      },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });
    const html = wrapper.html();
    expect(html.indexOf('<h1>')).toBeLessThan(html.indexOf('tag-chips'));
    expect(html.indexOf('tag-chips')).toBeLessThan(html.indexOf('<p>Body</p>'));
    const chips = wrapper.findAll('.tag-chip');
    expect(chips.map((chip) => chip.text())).toEqual(['運営', '技術']);
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map((link) => link.props().to)).toEqual([
      `/tag/${encodeURIComponent('運営')}`,
      `/tag/${encodeURIComponent('技術')}`
    ]);
  });

  it('renders no tag chips when the article has no tags field', () => {
    const wrapper = mount(ArticleContent, {
      props: {
        article: { title: 'T' },
        articleHtml: '<p>Body</p>'
      },
      global: { stubs: { RouterLink: true } }
    });
    expect(wrapper.find('.tag-chips').exists()).toBe(false);
  });
});
