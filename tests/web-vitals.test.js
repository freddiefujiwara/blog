import { describe, it, expect, vi, afterEach } from 'vitest';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { sendWebVital, initWebVitals } from '../src/web-vitals';
import { isStagingBuild } from '../src/staging-banner.js';

vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

vi.mock('../src/staging-banner.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isStagingBuild: vi.fn(actual.isStagingBuild),
  };
});

describe('web-vitals (Core Web Vitals -> GA4)', () => {
  afterEach(() => {
    delete window.gtag;
    vi.clearAllMocks();
    vi.mocked(isStagingBuild).mockReset();
    vi.mocked(isStagingBuild).mockImplementation(() => false);
  });

  it('registers all five metric callbacks', () => {
    initWebVitals();
    for (const on of [onCLS, onFCP, onINP, onLCP, onTTFB]) {
      expect(on).toHaveBeenCalledTimes(1);
      expect(on).toHaveBeenCalledWith(sendWebVital);
    }
  });

  it('registers nothing on staging builds', () => {
    vi.mocked(isStagingBuild).mockImplementation(() => true);
    initWebVitals();
    for (const on of [onCLS, onFCP, onINP, onLCP, onTTFB]) {
      expect(on).not.toHaveBeenCalled();
    }
  });

  it('sends an LCP metric as a wv_lcp event with a rounded value', () => {
    window.gtag = vi.fn();
    sendWebVital({ name: 'LCP', value: 1234.56 });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith('event', 'wv_lcp', {
      value: 1235,
      non_interaction: true,
    });
  });

  it('scales CLS by 1000 so the rounded value keeps precision', () => {
    window.gtag = vi.fn();
    sendWebVital({ name: 'CLS', value: 0.1234 });
    expect(window.gtag).toHaveBeenCalledWith('event', 'wv_cls', {
      value: 123,
      non_interaction: true,
    });
  });

  it('does nothing when gtag is not loaded', () => {
    expect(() => sendWebVital({ name: 'INP', value: 200 })).not.toThrow();
  });
});
