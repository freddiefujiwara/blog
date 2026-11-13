import { SCROLL_DEPTH_THRESHOLDS } from '../analytics.js';

// Current reading depth of the page as a percentage (0-100):
// the bottom edge of the viewport against the full document
// height. A page that fits inside the viewport counts as fully
// read (100), and so does a page whose height cannot be
// measured — over-reporting the end of a tiny page is harmless,
// while never reporting it would hide short articles entirely.
export function currentScrollPercent(win = window, doc = document) {
  const height = Math.max(
    Number(doc?.documentElement?.scrollHeight) || 0,
    Number(doc?.body?.scrollHeight) || 0,
  );
  const viewport = Number(win?.innerHeight) || 0;
  if (height <= 0 || height <= viewport) {
    return 100;
  }
  const top = Number(win?.scrollY ?? win?.pageYOffset) || 0;
  const percent = ((top + viewport) / height) * 100;
  return Math.min(100, Math.max(0, percent));
}

// Watches scrolling and reports each depth threshold the first
// time it is reached. start() also checks the position at once,
// so a short article reports its thresholds without any
// scrolling. One tracker serves one article view: the caller
// stops it and creates a fresh one when the article changes,
// which resets the reported set. Tracking is a passive scroll
// listener plus a resize listener (rotation and window resizes
// change the reachable depth without scrolling).
export function createScrollDepthTracker(onThreshold, win = window, doc = document) {
  const reached = new Set();
  let listening = false;

  const check = () => {
    const percent = currentScrollPercent(win, doc);
    for (const threshold of SCROLL_DEPTH_THRESHOLDS) {
      if (percent >= threshold && !reached.has(threshold)) {
        reached.add(threshold);
        onThreshold(threshold);
      }
    }
  };

  return {
    start() {
      if (!listening && win && typeof win.addEventListener === 'function') {
        listening = true;
        win.addEventListener('scroll', check, { passive: true });
        win.addEventListener('resize', check);
      }
      check();
    },
    stop() {
      if (!listening) {
        return;
      }
      listening = false;
      win.removeEventListener('scroll', check);
      win.removeEventListener('resize', check);
    },
  };
}
