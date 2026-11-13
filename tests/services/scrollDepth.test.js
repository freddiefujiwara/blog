import { describe, it, expect, vi } from 'vitest';
import { currentScrollPercent, createScrollDepthTracker } from '../../src/services/scrollDepth.js';

const fakeView = ({ height = 2000, viewport = 500, scrollY = 0 } = {}) => {
  const listeners = {};
  const win = {
    innerHeight: viewport,
    scrollY,
    addEventListener: vi.fn((type, handler) => {
      listeners[type] = handler;
    }),
    removeEventListener: vi.fn((type) => {
      delete listeners[type];
    }),
  };
  const doc = {
    documentElement: { scrollHeight: height },
    body: { scrollHeight: 0 },
  };
  return { win, doc, listeners };
};

describe('currentScrollPercent', () => {
  it('measures the viewport bottom against the document height', () => {
    const { win, doc } = fakeView({ height: 2000, viewport: 500, scrollY: 0 });
    expect(currentScrollPercent(win, doc)).toBe(25);
    win.scrollY = 500;
    expect(currentScrollPercent(win, doc)).toBe(50);
    win.scrollY = 1000;
    expect(currentScrollPercent(win, doc)).toBe(75);
    win.scrollY = 1500;
    expect(currentScrollPercent(win, doc)).toBe(100);
  });

  it('caps at 100 when scrolled past the end', () => {
    const { win, doc } = fakeView({ height: 2000, viewport: 500, scrollY: 4000 });
    expect(currentScrollPercent(win, doc)).toBe(100);
  });

  it('counts a page that fits in the viewport as fully read', () => {
    const { win, doc } = fakeView({ height: 400, viewport: 500, scrollY: 0 });
    expect(currentScrollPercent(win, doc)).toBe(100);
  });
});

describe('createScrollDepthTracker', () => {
  it('reports the depth already reached at start, without scrolling', () => {
    const { win, doc } = fakeView({ height: 2000, viewport: 500, scrollY: 500 });
    const onThreshold = vi.fn();
    createScrollDepthTracker(onThreshold, win, doc).start();
    expect(onThreshold.mock.calls.map(([p]) => p)).toEqual([25, 50]);
  });

  it('reports each threshold once as scrolling passes it', () => {
    const { win, doc, listeners } = fakeView({ height: 2000, viewport: 500, scrollY: 0 });
    const onThreshold = vi.fn();
    createScrollDepthTracker(onThreshold, win, doc).start();
    win.scrollY = 1000;
    listeners.scroll();
    listeners.scroll();
    win.scrollY = 1500;
    listeners.scroll();
    expect(onThreshold.mock.calls.map(([p]) => p)).toEqual([25, 50, 75, 100]);
  });

  it('reports every threshold at once for a short page', () => {
    const { win, doc } = fakeView({ height: 300, viewport: 500 });
    const onThreshold = vi.fn();
    createScrollDepthTracker(onThreshold, win, doc).start();
    expect(onThreshold.mock.calls.map(([p]) => p)).toEqual([25, 50, 75, 100]);
  });

  it('stops listening after stop()', () => {
    const { win, doc, listeners } = fakeView();
    const tracker = createScrollDepthTracker(vi.fn(), win, doc);
    tracker.start();
    tracker.stop();
    expect(win.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(win.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(listeners.scroll).toBeUndefined();
    expect(listeners.resize).toBeUndefined();
  });
});
