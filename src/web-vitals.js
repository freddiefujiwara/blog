// Core Web Vitals -> GA4.
//
// Each metric is reported as its own event (wv_lcp, wv_inp, ...)
// with the measured value in the standard `value` parameter, so
// the GA4 Data API can aggregate averages with eventValue /
// eventCount and no custom definitions are needed. CLS is scaled
// by 1000 before rounding, following Google's GA4 recipe, so the
// value keeps three decimal places of precision.
//
// Same suppression rule as page views: staging builds send
// nothing, so staging traffic cannot pollute production data.
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { isStagingBuild } from './staging-banner.js';

const EVENT_NAMES = {
  CLS: 'wv_cls',
  FCP: 'wv_fcp',
  INP: 'wv_inp',
  LCP: 'wv_lcp',
  TTFB: 'wv_ttfb',
};

export function sendWebVital(metric) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  const value = metric.name === 'CLS' ? metric.value * 1000 : metric.value;
  window.gtag('event', EVENT_NAMES[metric.name], {
    value: Math.round(value),
    non_interaction: true,
  });
}

export function initWebVitals() {
  if (isStagingBuild()) {
    return;
  }
  onCLS(sendWebVital);
  onFCP(sendWebVital);
  onINP(sendWebVital);
  onLCP(sendWebVital);
  onTTFB(sendWebVital);
}
