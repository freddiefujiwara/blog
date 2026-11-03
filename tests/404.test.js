import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// 404.html holds the spa-github-pages redirect: unknown paths are
// rewritten to /blog/?/<route> so the SPA index can restore the route.
// Staging lives one level deeper (/blog/staging/<route>), so the
// redirect must keep two path segments there; with one segment the
// staging URL was rewritten into the production app and articles
// that only exist in staging rendered as an empty page.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, '404.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const redirectFor = (pathname) => {
  let target = null;
  const location = {
    pathname,
    search: '',
    hash: '',
    protocol: 'https:',
    hostname: 'freddiefujiwara.com',
    port: '',
    replace: (url) => {
      target = url;
    }
  };
  new Function('window', script)({ location });
  return target;
};

describe('404.html redirect', () => {
  it('rewrites a production article path under /blog/', () => {
    expect(redirectFor('/blog/some-article-id')).toBe(
      'https://freddiefujiwara.com/blog/?/some-article-id'
    );
  });

  it('keeps staging article paths under /blog/staging/', () => {
    expect(redirectFor('/blog/staging/some-article-id')).toBe(
      'https://freddiefujiwara.com/blog/staging/?/some-article-id'
    );
  });
});
