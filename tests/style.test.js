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
});
