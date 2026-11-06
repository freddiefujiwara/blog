// Google Analytics 4 (gtag.js) page-view tracking for the SPA.
// The gtag snippet itself is loaded from index.html with
// send_page_view: false; this module is the single place that
// emits page_view events, driven by the router.
import { isStagingBuild } from './staging-banner.js';

export const GA_MEASUREMENT_ID = 'G-W2C6FNCW86';

// The router hands us its base-relative full path (e.g. "/<article-id>"),
// which lacks the app base ("/blog/"). GA expects the real URL path, so
// put the base back; otherwise one article is recorded under two
// different page paths and splits in every ranking. Query strings and
// fragments are not part of the page path and are dropped.
export function canonicalPagePath(pagePath, baseUrl = import.meta.env.BASE_URL) {
  const rawPath = String(pagePath || '/').split(/[?#]/)[0] || '/';
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const trimmedBase = String(baseUrl || '/').replace(/^\/+|\/+$/g, '');
  if (!trimmedBase) {
    return path;
  }
  const base = `/${trimmedBase}/`;
  if (path === `/${trimmedBase}`) {
    return base;
  }
  if (path.startsWith(base)) {
    return path;
  }
  if (path === '/') {
    return base;
  }
  return `${base.slice(0, -1)}${path}`;
}

// Header nav clicks are measured as nav_click events with the item
// key (top / about / activity / contact / blog / list), so the nav
// can be trimmed later based on which items are actually used.
// Same suppression rules as page views: nothing is sent on staging
// builds or when gtag is not loaded.
export function trackNavClick(navItem) {
  if (isStagingBuild()) {
    return;
  }
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', 'nav_click', { nav_item: navItem });
}

export function trackPageView(pagePath) {
  // Staging traffic (previews, ledger articles, checks) must not
  // pollute the production measurement, so send nothing there.
  if (isStagingBuild()) {
    return;
  }
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', 'page_view', {
    page_path: canonicalPagePath(pagePath),
    page_title: document.title,
  });
}
