import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const cssPath = join(dirname(fileURLToPath(import.meta.url)), '../src/style.css');
const css = readFileSync(cssPath, 'utf8');

// Extract the declaration block for an exact selector like `article a { ... }`.
const blockFor = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('article link styles (long URL overflow regression)', () => {
  it('lets long unbroken URLs wrap inside article links', () => {
    const block = blockFor('article a');
    expect(block).not.toBe('');
    expect(block).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe('OGP link cards', () => {
  it('renders standalone links as a bordered flex card', () => {
    const block = blockFor('article a.link-card');
    expect(block).not.toBe('');
    expect(block).toMatch(/display:\s*flex/);
    expect(block).toMatch(/border:\s*1px solid var\(--border\)/);
    expect(block).toMatch(/text-decoration:\s*none/);
  });

  it('keeps the card image a fixed-size cover thumbnail', () => {
    const block = blockFor('article .link-card-image');
    expect(block).not.toBe('');
    expect(block).toMatch(/object-fit:\s*cover/);
    expect(block).toMatch(/width:\s*112px/);
  });

  it('clamps the card title to two lines', () => {
    const block = blockFor('article .link-card-title');
    expect(block).not.toBe('');
    expect(block).toMatch(/-webkit-line-clamp:\s*2/);
  });

  it('grays out images flagged .is-grayout', () => {
    const block = blockFor('article img.is-grayout');
    expect(block).not.toBe('');
    expect(block).toMatch(/opacity:\s*\.55/);
    expect(block).toMatch(/filter:\s*grayscale\(1\)/);
  });
});

describe('compact one-line navigation', () => {
  it('keeps nav titles on a single line with an ellipsis', () => {
    const block = blockFor('.nav-title');
    expect(block).not.toBe('');
    expect(block).toMatch(/white-space:\s*nowrap/);
    expect(block).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('does not reserve a fixed height for the navigation', () => {
    const block = blockFor('.navigation');
    expect(block).not.toBe('');
    expect(block).not.toMatch(/min-height/);
  });

  it('lets a lone nav link use the full row width', () => {
    const block = blockFor('.nav-link:only-child');
    expect(block).not.toBe('');
    expect(block).toMatch(/max-width:\s*100%/);
  });
});

describe('article title links in lists (tag page, title search)', () => {
  // List titles are links, so they take the accent color like the tag
  // chips do; in the plain text color they read as body text and the
  // reader cannot tell they are tappable (user report, 2026-11-07).
  it('colors tag page article titles with the accent color', () => {
    const block = blockFor('.tag-article-item a');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*var\(--primary\)/);
    expect(block).not.toMatch(/color:\s*var\(--text\)/);
  });

  it('keeps a distinct hover state on tag page article titles', () => {
    const block = blockFor('.tag-article-item a:hover');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*var\(--link-active\)/);
    expect(block).toMatch(/background:\s*var\(--surface-elevated\)/);
  });

  it('colors title search result titles with the accent color', () => {
    const block = blockFor('.title-search .title-search-item a');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*var\(--primary\)/);
    expect(block).not.toMatch(/color:\s*var\(--text\)/);
  });

  it('keeps a distinct hover state on title search result titles', () => {
    const block = blockFor('.title-search .title-search-item a:hover');
    expect(block).not.toBe('');
    expect(block).toMatch(/color:\s*var\(--link-active\)/);
    expect(block).toMatch(/background:\s*var\(--surface-elevated\)/);
  });
});

describe('title search results inside the site nav', () => {
  it('scopes the results list under .title-search so the nav list styles cannot leak in', () => {
    const block = blockFor('.title-search .title-search-results');
    expect(block).not.toBe('');
    expect(block).toMatch(/display:\s*block/);
    const item = blockFor('.title-search .title-search-item a');
    expect(item).not.toBe('');
    expect(item).toMatch(/display:\s*block/);
    // The nav's links are nowrap; long result titles must wrap.
    expect(item).toMatch(/white-space:\s*normal/);
  });

  it('lets the nav dropdown open wider than the input, anchored to its right edge', () => {
    const block = blockFor('.nav-search .title-search .title-search-results');
    expect(block).not.toBe('');
    expect(block).toMatch(/right:\s*0/);
    expect(block).toMatch(/width:\s*min\(340px/);
  });
});
