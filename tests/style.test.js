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
