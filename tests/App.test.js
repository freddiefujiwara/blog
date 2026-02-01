import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders latest article and sets title', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['latest-id'])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'latest-id',
            title: '最新記事',
            markdown: '本文です。'
          })
      });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('h1').text()).toBe('最新記事');
    expect(wrapper.find('article').html()).toContain('本文です。');
    expect(document.title).toBe('最新記事');
  });
});
