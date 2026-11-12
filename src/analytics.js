// Google Analytics 4 (gtag.js) page-view tracking for the SPA.
// The gtag snippet itself is loaded from index.html with
// send_page_view: false; this module is the single place that
// emits page_view events, driven by the router.
import { isStagingBuild } from './staging-banner.js';

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

// Play presses are the music player's top KPI: every deliberate
// start of playback (the play button, or a track-list tap) is a
// music_play event with its method, so the count can be read
// straight from GA4. Automatic advances between tracks are not
// presses and are not counted. Same suppression rules as the
// other events.
export function trackMusicPlay(method) {
  if (isStagingBuild()) {
    return;
  }
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', 'music_play', { method });
}

// How long the reader waits, in milliseconds, so the values can
// be registered as custom metrics in GA4 and read as averages.
// music_ready fires once per player, when the first track has been
// fetched and cached; ready_ms is measured from page load, so it
// is the time until a press would start playback almost at once.
// music_latency fires when playback actually starts after a start
// intent (button / list / auto advance); latency_ms runs from the
// intent to the audio element's 'playing' event. Same suppression
// rules as the other events.
const sendTiming = (eventName, paramName, ms, extra = {}) => {
  if (isStagingBuild()) {
    return;
  }
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  const value = Math.round(Number(ms));
  if (!Number.isFinite(value) || value < 0) {
    return;
  }
  window.gtag('event', eventName, { [paramName]: value, ...extra });
};

export function trackMusicReady(ms) {
  sendTiming('music_ready', 'ready_ms', ms);
}

export function trackMusicLatency(ms, method) {
  sendTiming('music_latency', 'latency_ms', ms, { method });
}

// article_render: how long the reader waited for an article to
// appear — from the navigation (the page load for the first
// article, the route change afterwards) until the article body
// has been painted. render_ms is registered as the custom metric
// 「記事表示時間」 in GA4, so per-article average display times
// can be read from the Data API (articles nobody read simply
// have no data). Same suppression rules as the other events.
//
// The event also carries the two waits that make up the total —
// list_ms (until the article list resolved) and fetch_ms (until
// the article body arrived) — so a slow display can be told
// apart by which leg stalled. The parameters ride along from
// the start; reading them back as averages needs them registered
// as custom metrics in GA4 as well.
//
// A display at or over SLOW_RENDER_THRESHOLD_MS also sends the
// companion event article_render_slow. An average alone cannot
// tell one stalled load from uniformly slow displays (the map
// article's 2026-11-12 average of 7.5s was six ~1.8s displays
// and one 41.8s stall); counting the slow event per article —
// a plain event count, which needs no custom metric — makes
// the outliers visible in the collected data.
export const SLOW_RENDER_THRESHOLD_MS = 10000;

const phaseParam = (value) => {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : undefined;
};

export function trackArticleRender(ms, phases = {}) {
  const extra = {};
  const listMs = phaseParam(phases.listMs);
  if (listMs !== undefined) {
    extra.list_ms = listMs;
  }
  const fetchMs = phaseParam(phases.fetchMs);
  if (fetchMs !== undefined) {
    extra.fetch_ms = fetchMs;
  }
  sendTiming('article_render', 'render_ms', ms, extra);
  const value = Math.round(Number(ms));
  if (Number.isFinite(value) && value >= SLOW_RENDER_THRESHOLD_MS) {
    sendTiming('article_render_slow', 'render_ms', ms, extra);
  }
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
