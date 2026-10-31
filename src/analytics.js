// Google Analytics 4 (gtag.js) page-view tracking for the SPA.
// The gtag snippet itself is loaded from index.html with
// send_page_view: false; this module is the single place that
// emits page_view events, driven by the router.
export const GA_MEASUREMENT_ID = 'G-W2C6FNCW86';

export function trackPageView(pagePath) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: document.title,
  });
}
