import { describe, it, expect, vi, afterEach } from 'vitest';
import { trackPageView, trackNavClick, trackMusicPlay, trackMusicReady, trackMusicLatency, trackArticleRender, trackArticleScroll, canonicalPagePath } from '../src/analytics';
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

  it('sends a music_play event with the method', () => {
    window.gtag = vi.fn();
    trackMusicPlay('button');
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_play', { method: 'button' });
  });

  it('sends a music_ready event with the rounded milliseconds', () => {
    window.gtag = vi.fn();
    trackMusicReady(1234.56);
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_ready', { ready_ms: 1235 });
  });

  it('sends a music_latency event with milliseconds and method', () => {
    window.gtag = vi.fn();
    trackMusicLatency(250.4, 'list');
    expect(window.gtag).toHaveBeenCalledWith('event', 'music_latency', { latency_ms: 250, method: 'list' });
  });

  it('timing events ignore unusable values and a missing gtag', () => {
    expect(() => trackMusicReady(Number.NaN)).not.toThrow();
    expect(() => trackMusicLatency(-5, 'button')).not.toThrow();
    window.gtag = vi.fn();
    trackMusicReady(Number.NaN);
    trackMusicLatency(-5, 'button');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends no timing events on a staging build', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    window.gtag = vi.fn();
    trackMusicReady(100);
    trackMusicLatency(100, 'button');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends an article_render event with the rounded milliseconds', () => {
    window.gtag = vi.fn();
    trackArticleRender(987.6);
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render', { render_ms: 988 });
  });

  it('article_render ignores unusable values', () => {
    window.gtag = vi.fn();
    trackArticleRender(Number.NaN);
    trackArticleRender(-1);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('sends no article_render on a staging build', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    window.gtag = vi.fn();
    trackArticleRender(100);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('carries the list and fetch waits as parameters of article_render', () => {
    window.gtag = vi.fn();
    trackArticleRender(1500, { listMs: 400.4, fetchMs: 1050.6 });
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render', {
      render_ms: 1500,
      list_ms: 400,
      fetch_ms: 1051
    });
  });

  it('omits phase parameters that are not usable numbers', () => {
    window.gtag = vi.fn();
    trackArticleRender(1500, { listMs: Number.NaN, fetchMs: -3 });
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render', {
      render_ms: 1500
    });
  });

  it('sends article_render_slow alongside at and over ten seconds', () => {
    window.gtag = vi.fn();
    trackArticleRender(10000, { listMs: 8000, fetchMs: 1900 });
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render', {
      render_ms: 10000,
      list_ms: 8000,
      fetch_ms: 1900
    });
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render_slow', {
      render_ms: 10000,
      list_ms: 8000,
      fetch_ms: 1900
    });
    window.gtag.mockClear();
    trackArticleRender(41843);
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render_slow', {
      render_ms: 41843
    });
  });

  it('sends no article_render_slow under ten seconds', () => {
    window.gtag = vi.fn();
    trackArticleRender(9999, { listMs: 9000, fetchMs: 900 });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_render', {
      render_ms: 9999,
      list_ms: 9000,
      fetch_ms: 900
    });
  });

  it('sends no article_render_slow on a staging build', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    window.gtag = vi.fn();
    trackArticleRender(20000, { listMs: 19000, fetchMs: 900 });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('music_play does nothing when gtag is not loaded', () => {
    expect(() => trackMusicPlay('list')).not.toThrow();
  });

  it('sends no music_play on a staging build', () => {
    vi.mocked(isStagingBuild).mockReturnValue(true);
    window.gtag = vi.fn();
    trackMusicPlay('button');
    expect(window.gtag).not.toHaveBeenCalled();
  });
});

describe('analytics article_scroll (reading depth)', () => {
  afterEach(() => {
    delete window.gtag;
    vi.mocked(isStagingBuild).mockReset();
    vi.mocked(isStagingBuild).mockImplementation(() => false);
  });

  it('sends an article_scroll event with the reached threshold', () => {
    window.gtag = vi.fn();
    trackArticleScroll(50);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'article_scroll', {
      percent_scrolled: 50,
    });
  });

  it('drops values outside the threshold set', () => {
    window.gtag = vi.fn();
    trackArticleScroll(30);
    trackArticleScroll(0);
    trackArticleScroll('50');
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('does nothing when gtag is not loaded', () => {
    expect(() => trackArticleScroll(100)).not.toThrow();
  });

  it('sends nothing on a staging build', () => {
    vi.mocked(isStagingBuild).mockReturnValue(true);
    window.gtag = vi.fn();
    trackArticleScroll(100);
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
