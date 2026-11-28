import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../src/App.vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import BlogView from '../src/pages/BlogView.vue';
import TagView from '../src/pages/TagView.vue';
import { t } from '../src/services/i18n';
import { renderGoogleSignInButton } from '../src/services/auth';

// The staging gate is reactive: the app loads as usual, and an
// "unauthorized" answer from the backend swaps the layout for the
// sign-in panel (the flow the other auth-gated apps use).
vi.mock('../src/staging-banner.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isStagingBuild: vi.fn(() => true)
  };
});

vi.mock('../src/services/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    renderGoogleSignInButton: vi.fn().mockResolvedValue(undefined)
  };
});

describe('App staging sign-in gate', () => {
  let router;

  beforeEach(async () => {
    localStorage.clear();
    vi.mocked(renderGoogleSignInButton).mockClear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
      if (url.includes('script.google.com')) {
        return { ok: true, json: () => Promise.resolve({ error: 'unauthorized' }) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }));
    router = createRouter({
      history: createMemoryHistory('/blog/staging/'),
      routes: [
        { path: '/', component: BlogView },
        { path: '/tag/:tag', name: 'tag', component: TagView, props: true },
        { path: '/:id', name: 'post', component: BlogView, props: true }
      ]
    });
    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the sign-in gate when the backend answers unauthorized', async () => {
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const gate = wrapper.find('.login-gate');
    expect(gate.exists()).toBe(true);
    expect(gate.text()).toContain(t('signInRequired'));
    expect(wrapper.find('.layout').exists()).toBe(false);
    expect(renderGoogleSignInButton).toHaveBeenCalled();
  });
});

describe('App staging share-link issuer', () => {
  let router;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('blog:session:v1:staging', 'sess1');
    vi.mocked(renderGoogleSignInButton).mockClear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url) => {
      if (url.includes('?o=rss')) {
        return { ok: true, text: () => Promise.resolve('<rss>content</rss>') };
      }
      if (url.includes('action=issue_share')) {
        return {
          ok: true,
          json: () => Promise.resolve({
            share_token: 'share1',
            expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000
          })
        };
      }
      if (url.includes('o=titles')) {
        return {
          ok: true,
          json: () => Promise.resolve({ ids: ['a1'], titles: { a1: 'Article One' }, tags: {} })
        };
      }
      if (url.includes('script.google.com')) {
        return {
          ok: true,
          json: () => Promise.resolve({ id: 'a1', title: 'Article One', markdown: 'Body', tags: [] })
        };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    }));
    router = createRouter({
      history: createMemoryHistory('/blog/staging/'),
      routes: [
        { path: '/', component: BlogView },
        { path: '/tag/:tag', name: 'tag', component: TagView, props: true },
        { path: '/:id', name: 'post', component: BlogView, props: true }
      ]
    });
    await router.push('/');
    await router.isReady();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the issuer to a signed-in owner and displays the minted link', async () => {
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const admin = wrapper.find('.share-admin');
    expect(admin.exists()).toBe(true);
    expect(admin.text()).toContain(t('shareLinkTitle'));

    await admin.find('button').trigger('click');
    await flushPromises();

    const input = wrapper.find('.share-admin-url');
    expect(input.exists()).toBe(true);
    expect(input.element.value).toContain('#share=share1');
    expect(wrapper.find('.share-admin-expires').text()).toContain(t('shareLinkExpires'));
  });

  it('hides the issuer when there is no session', async () => {
    localStorage.removeItem('blog:session:v1:staging');
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.find('.share-admin').exists()).toBe(false);
  });
});
