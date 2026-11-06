import { describe, it, expect, vi, afterEach } from 'vitest';
import { trackPageView, trackNavClick, canonicalPagePath, GA_MEASUREMENT_ID } from '../src/analytics';
import { isStagingBuild } from '../src/staging-banner.js';

vi.mock('../src/staging-banner.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isStagingBuild: vi.fn(actual.isStagingBuild),
  };
});

describe('analytics (GA4 page-view tracking)', () => {
  afterEach(() => {
    delete window.gtag;
    vi.mocked(isStagingBuild).mockReset();
    vi.mocked(isStagingBuild).mockImplementation(() => false);
  });

  it('uses the freddiefujiwara.com measurement ID', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-W2C6FNCW86');
  });

  it('sends a page_view event with the canonical path (app base restored)', () => {
    window.gtag = vi.fn();
    trackPageView('/some-article-id');
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/blog/some-article-id',
      page_title: document.title,
    });
  });

  it('does nothing when gtag is not loaded', () => {
    expect(() => trackPageView('/x')).not.toThrow();
  });

  it('canonicalPagePath restores the app base exactly once', () => {
    expect(canonicalPagePath('/some-article-id', '/blog/')).toBe('/blog/some-article-id');
    expect(canonicalPagePath('/blog/some-article-id', '/blog/')).toBe('/blog/some-article-id');
    expect(canonicalPagePath('/', '/blog/')).toBe('/blog/');
    expect(canonicalPagePath('/blog', '/blog/')).toBe('/blog/');
    expect(canonicalPagePath('/some-article-id?utm_source=x#frag', '/blog/')).toBe(
      '/blog/some-article-id',
    );
    expect(canonicalPagePath('/some-article-id', '/')).toBe('/some-article-id');
  });

  it('sends nothing on a staging build', () => {
    vi.mocked(isStagingBuild).mockReturnValue(true);
    window.gtag = vi.fn();
    trackPageView('/some-article-id');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends a nav_click event with the nav item', () => {
    window.gtag = vi.fn();
    trackNavClick('about');
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'nav_click', {
      nav_item: 'about',
    });
  });

  it('nav_click does nothing when gtag is not loaded', () => {
    expect(() => trackNavClick('blog')).not.toThrow();
  });

  it('sends no nav_click on a staging build', () => {
    vi.mocked(isStagingBuild).mockReturnValue(true);
    window.gtag = vi.fn();
    trackNavClick('blog');
    expect(window.gtag).not.toHaveBeenCalled();
  });
});

describe('index.html gtag snippet', () => {
  it('loads gtag with the measurement ID and defers page views to the router', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const html = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../index.html'),
      'utf8',
    );
    expect(html).toContain('googletagmanager.com/gtag/js?id=G-W2C6FNCW86');
    expect(html).toContain("gtag('config', 'G-W2C6FNCW86', { send_page_view: false })");
  });
});
