import { describe, expect, it } from 'vitest';
import { extractTocFromHtml, hashHeadingText, renderMarkdown, splitHtmlAtTocMarkers, wrapLyricsBlocks } from '../../src/services/markdown';

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
  it('opens external links in a new tab', () => {
    const html = renderMarkdown('[例](https://example.com/page)');
    expect(html).toContain('<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">例</a>');
  });

  it('opens other apps on the same site in a new tab', () => {
    const html = renderMarkdown('[持ち物](https://freddiefujiwara.com/list-of-stuff/)');
    expect(html).toContain('target="_blank"');
    const pathHtml = renderMarkdown('[持ち物](/list-of-stuff/)');
    expect(pathHtml).toContain('target="_blank"');
  });

  it('keeps links under /blog in the same tab', () => {
    const urlHtml = renderMarkdown('[前回](https://freddiefujiwara.com/blog/abc)');
    expect(urlHtml).toContain('<a href="https://freddiefujiwara.com/blog/abc">前回</a>');
    const pathHtml = renderMarkdown('[前回](/blog/abc)');
    expect(pathHtml).toContain('<a href="/blog/abc">前回</a>');
    expect(pathHtml).not.toContain('target=');
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

describe('renderMarkdown bare URLs in Japanese text', () => {
  it('stops a bare URL at Japanese text that follows without a space', () => {
    const html = renderMarkdown('ステージング（https://freddiefujiwara.com/staging/）で新セクションの表示を確認済み。本人のマージ待ち。');
    expect(html).toContain('>https://freddiefujiwara.com/staging/</a>）で新セクションの表示を確認済み。本人のマージ待ち。');
    expect(html).not.toContain('マージ待ち。</a>');
  });

  it('links only the URL when a space follows it', () => {
    const html = renderMarkdown('URLは https://freddiefujiwara.com のまま。');
    expect(html).toContain('>https://freddiefujiwara.com</a> のまま。');
  });

  it('keeps a bare /blog URL in the same tab', () => {
    const html = renderMarkdown('前回（https://freddiefujiwara.com/blog/abc）を見てください');
    expect(html).toContain('<a href="https://freddiefujiwara.com/blog/abc">https://freddiefujiwara.com/blog/abc</a>）を見てください');
    expect(html).not.toContain('target=');
  });

  it('leaves Markdown link destinations untouched', () => {
    const html = renderMarkdown('[例](https://example.com/page)');
    expect(html).toContain('<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">例</a>');
  });

  it('leaves URLs inside code spans untouched', () => {
    const html = renderMarkdown('`https://example.com` を参照');
    expect(html).toContain('<code>https://example.com</code>');
    expect(html).not.toContain('&lt;https');
  });

  it('leaves URLs inside HTML attributes untouched', () => {
    const html = renderMarkdown('<a href="https://example.com/x">タイトル</a>');
    expect(html).toContain('<a href="https://example.com/x">タイトル</a>');
    expect(html).not.toContain('&lt;https');
  });
});

describe('extractTocFromHtml', () => {
  it('lists ## and ### headings with the ids renderMarkdown assigned', () => {
    const html = renderMarkdown('# タイトル\n\n## 見出しA\n\n本文\n\n### 小見出し\n\n#### 深すぎる見出し\n\n## 見出しB');
    const toc = extractTocFromHtml(html);
    expect(toc.map((e) => e.level)).toEqual([2, 3, 2]);
    expect(toc.map((e) => e.text)).toEqual(['見出しA', '小見出し', '見出しB']);
    expect(toc[0].id).toBe(hashHeadingText('見出しA'));
    expect(toc[1].id).toBe(hashHeadingText('小見出し'));
    for (const entry of toc) {
      expect(html).toContain(`id="${entry.id}"`);
    }
  });

  it('keeps the duplicate suffix so repeated headings stay distinct', () => {
    const html = renderMarkdown('## 同じ見出し\n\n## 同じ見出し');
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(2);
    expect(toc[0].id).toBe(hashHeadingText('同じ見出し'));
    expect(toc[1].id).toBe(`${hashHeadingText('同じ見出し')}-2`);
  });

  it('strips inline markup from heading text', () => {
    const html = renderMarkdown('## **太字**と`コード`の見出し');
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(1);
    expect(toc[0].text).toBe('太字とコードの見出し');
  });

  it('returns an empty list when there are no matching headings', () => {
    expect(extractTocFromHtml('<p>本文だけ</p>')).toEqual([]);
    expect(extractTocFromHtml('')).toEqual([]);
    expect(extractTocFromHtml(null)).toEqual([]);
  });
});

describe('splitHtmlAtTocMarkers', () => {
  it('splits at a paragraph containing only the marker', () => {
    expect(splitHtmlAtTocMarkers('<p>Intro</p><p>[[目次]]</p><p>Body</p>')).toEqual([
      '<p>Intro</p>',
      '<p>Body</p>'
    ]);
  });

  it('accepts the full-width bracket variant', () => {
    expect(splitHtmlAtTocMarkers('<p>Intro</p><p>［［目次］］</p><p>Body</p>')).toEqual([
      '<p>Intro</p>',
      '<p>Body</p>'
    ]);
  });

  it('splits at every marker when several are present', () => {
    const html = '<p>A</p><p>[[目次]]</p><p>B</p><p>[[目次]]</p><p>C</p>';
    expect(splitHtmlAtTocMarkers(html)).toEqual(['<p>A</p>', '<p>B</p>', '<p>C</p>']);
  });

  it('returns null when the marker is not alone in its paragraph', () => {
    expect(splitHtmlAtTocMarkers('<p>前 [[目次]] 後</p>')).toBeNull();
  });

  it('returns null when there is no marker', () => {
    expect(splitHtmlAtTocMarkers('<p>Intro</p>')).toBeNull();
    expect(splitHtmlAtTocMarkers('')).toBeNull();
    expect(splitHtmlAtTocMarkers(null)).toBeNull();
  });
});

describe('wrapLyricsBlocks', () => {
  it('boxes the label and the lyric lines that follow it', () => {
    const md = '## 曲の見出し\n\n**歌詞**\n\n[Intro]\n\n朝の風だね\n\nペダルを踏んで';
    const out = wrapLyricsBlocks(md);
    expect(out).toContain('<div class="lyrics"><p class="lyrics-label">歌詞</p>');
    expect(out).toContain('<p class="lyrics-part">[Intro]</p>');
    expect(out).toContain('<p class="lyrics-line">朝の風だね</p>');
    expect(out).toContain('<p class="lyrics-line">ペダルを踏んで</p></div>');
    expect(out).toContain('## 曲の見出し');
  });

  it('stops at the next heading', () => {
    const md = '**歌詞**\n\n一行目\n\n## 次の見出し\n\n本文です。';
    const out = wrapLyricsBlocks(md);
    expect(out).toContain('<p class="lyrics-line">一行目</p></div>');
    expect(out).toContain('## 次の見出し');
  });

  it('keeps a closing sentence outside the box', () => {
    const md = '**歌詞**\n\n最後の歌詞行\n\n曲になりそうな道があれば、ぜひ教えてください。';
    const out = wrapLyricsBlocks(md);
    expect(out).toContain('<p class="lyrics-line">最後の歌詞行</p></div>');
    expect(out).toContain('\n\n曲になりそうな道があれば、ぜひ教えてください。');
  });

  it('leaves a lone label untouched when no lyric line follows', () => {
    const md = '**歌詞**\n\nこれは歌詞ではなく、文章です。';
    expect(wrapLyricsBlocks(md)).toBe(md);
  });

  it('leaves markdown without the label untouched', () => {
    const md = '## 見出し\n\n普通の段落です。\n\n短い行';
    expect(wrapLyricsBlocks(md)).toBe(md);
  });

  it('escapes HTML inside lyric lines', () => {
    const md = '**歌詞**\n\nA & B <tag>';
    expect(wrapLyricsBlocks(md)).toContain('<p class="lyrics-line">A &amp; B &lt;tag&gt;</p>');
  });

  it('renders as a lyrics box through renderMarkdown', () => {
    const html = renderMarkdown('**歌詞**\n\n朝の風だね');
    expect(html).toContain('<div class="lyrics">');
    expect(html).toContain('<p class="lyrics-line">朝の風だね</p>');
  });
});
