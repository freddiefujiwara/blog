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

  it('uses the shared profile-photo favicon set', () => {
    expect(html).toContain('<link rel="icon" href="/blog/favicon.ico" sizes="any">');
    expect(html).toContain(
      '<link rel="icon" type="image/png" sizes="32x32" href="/blog/favicon-32.png">'
    );
    expect(html).toContain(
      '<link rel="icon" type="image/png" sizes="16x16" href="/blog/favicon-16.png">'
    );
    expect(html).toContain(
      '<link rel="apple-touch-icon" sizes="180x180" href="/blog/apple-touch-icon.png">'
    );
    expect(html).not.toContain('data:image/svg+xml');
  });
});
