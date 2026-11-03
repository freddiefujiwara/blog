import { describe, expect, it } from 'vitest';
import { hashHeadingText, renderMarkdown } from '../../src/services/markdown';

describe('hashHeadingText', () => {
  it('returns a short ASCII id', () => {
    expect(hashHeadingText('障害1：テスト、です')).toMatch(/^h-[0-9a-f]{8}$/);
  });

  it('is deterministic and text-sensitive', () => {
    expect(hashHeadingText('見出しA')).toBe(hashHeadingText('見出しA'));
    expect(hashHeadingText('見出しA')).not.toBe(hashHeadingText('見出しB'));
  });
});

describe('renderMarkdown', () => {
  it('gives a heading the hashed id of its text', () => {
    const text = '障害1：テスト、です';
    const html = renderMarkdown(`## ${text}`);
    expect(html).toContain(`<h2 id="${hashHeadingText(text)}">${text}</h2>`);
  });

  it('makes duplicate heading ids unique with a numeric suffix', () => {
    const base = hashHeadingText('見出し');
    const html = renderMarkdown('## 見出し\n\n## 見出し\n\n## 見出し');
    expect(html).toContain(`<h2 id="${base}">見出し</h2>`);
    expect(html).toContain(`<h2 id="${base}-2">見出し</h2>`);
    expect(html).toContain(`<h2 id="${base}-3">見出し</h2>`);
  });

  it('derives the id from the plain text of a heading with inline markup', () => {
    const html = renderMarkdown('## **太字**の見出し');
    expect(html).toContain(`id="${hashHeadingText('太字の見出し')}"`);
    expect(html).toContain('<strong>太字</strong>');
  });

  it('leaves non-heading content as before', () => {
    const html = renderMarkdown('ただの本文です');
    expect(html).toContain('<p>ただの本文です</p>');
  });
});

describe('renderMarkdown link targets', () => {
  it('opens external sites in a new tab', () => {
    const html = renderMarkdown('[例](https://example.com/page)');
    expect(html).toContain('<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">例</a>');
  });

  it('keeps links to other apps on this site in the same tab', () => {
    const html = renderMarkdown('[持ち物](https://freddiefujiwara.com/list-of-stuff/)');
    expect(html).toContain('<a href="https://freddiefujiwara.com/list-of-stuff/">持ち物</a>');
    expect(html).not.toContain('target=');
    const pathHtml = renderMarkdown('[持ち物](/list-of-stuff/)');
    expect(pathHtml).not.toContain('target=');
  });

  it('keeps links under /blog in the same tab', () => {
    const html = renderMarkdown('[前回](https://freddiefujiwara.com/blog/abc)');
    expect(html).toContain('<a href="https://freddiefujiwara.com/blog/abc">前回</a>');
    expect(html).not.toContain('target=');
  });

  it('keeps fragment links in the same tab', () => {
    const html = renderMarkdown('[障害1](#h-12345678)');
    expect(html).toContain('<a href="#h-12345678">障害1</a>');
    expect(html).not.toContain('target=');
  });

  it('leaves non-web links untouched', () => {
    const html = renderMarkdown('[メール](mailto:a@example.com)');
    expect(html).not.toContain('target=');
  });
});
