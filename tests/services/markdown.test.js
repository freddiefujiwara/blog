import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/services/markdown';

describe('renderMarkdown', () => {
  it('gives a heading an id derived from its text', () => {
    const html = renderMarkdown('## 障害1：テスト、です');
    expect(html).toContain(
      '<h2 id="障害1：テスト、です">障害1：テスト、です</h2>'
    );
  });

  it('makes duplicate heading ids unique with a numeric suffix', () => {
    const html = renderMarkdown('## 見出し\n\n## 見出し\n\n## 見出し');
    expect(html).toContain('<h2 id="見出し">見出し</h2>');
    expect(html).toContain('<h2 id="見出し-2">見出し</h2>');
    expect(html).toContain('<h2 id="見出し-3">見出し</h2>');
  });

  it('derives the id from the plain text of a heading with inline markup', () => {
    const html = renderMarkdown('## **太字**の見出し');
    expect(html).toContain('id="太字の見出し"');
    expect(html).toContain('<strong>太字</strong>');
  });

  it('leaves non-heading content as before', () => {
    const html = renderMarkdown('ただの本文です');
    expect(html).toContain('<p>ただの本文です</p>');
  });
});
