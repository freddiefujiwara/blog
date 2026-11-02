import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../index.html'),
  'utf8'
);

describe('index.html performance hints', () => {
  it('only loads the font weights the styles actually use', () => {
    expect(html).toContain('Shippori+Mincho+B1:wght@700;800');
    expect(html).toContain('Zen+Kaku+Gothic+New:wght@400;500;700');
    expect(html).not.toContain('wght@600');
    expect(html).not.toContain('wght@900');
  });

  it('preconnects to the API hosts', () => {
    expect(html).toContain(
      'rel="preconnect" href="https://script.google.com"'
    );
    expect(html).toContain(
      'rel="preconnect" href="https://script.googleusercontent.com"'
    );
  });
});
