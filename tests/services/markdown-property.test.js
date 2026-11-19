import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  delimitBareUrls,
  expandAnchorMarkers,
  extractTocFromHtml,
  renderMarkdown,
  wrapLyricsBlocks
} from '../../src/services/markdown';

// Property-based tests for the markdown pipeline. The example-based
// tests in markdown.test.js pin specific articles' shapes; these pin
// the invariants that must hold for ANY input, including the ones
// nobody thought to write an example for: the pipeline never throws,
// never invents replacement characters, and never rewrites the
// segments an author marked as literal (code, lyrics, link cards).

const RUNS = { numRuns: 100 };

// A soup of markdown-significant fragments: Japanese prose pieces,
// markup characters and a bare URL, in random order and length.
const soup = fc
  .array(
    fc.constantFrom(
      'あ', '川', '。', 'a', 'Z', '0', ' ', '\n', '#', '*', '`',
      '[', ']', '(', ')', '<', '>', '|', '~',
      'https://example.com/x', '歌詞', '［', '］'
    ),
    { minLength: 0, maxLength: 60 }
  )
  .map((parts) => parts.join(''));

const urlSegment = fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,10}$/);
const url = fc
  .tuple(urlSegment, fc.array(urlSegment, { minLength: 0, maxLength: 3 }))
  .map(([host, path]) => `https://${host}.example.com${path.length ? `/${path.join('/')}` : ''}`);

describe('markdown pipeline properties', () => {
  it('never throws and never introduces U+FFFD, whatever the input', () => {
    fc.assert(
      fc.property(soup, (text) => {
        fc.pre(!text.includes('\uFFFD'));
        [delimitBareUrls, wrapLyricsBlocks, expandAnchorMarkers, renderMarkdown].forEach((stage) => {
          const out = stage(text);
          expect(typeof out).toBe('string');
          expect(out.includes('\uFFFD')).toBe(false);
        });
      }),
      RUNS
    );
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (text) => {
        expect(typeof renderMarkdown(text)).toBe('string');
      }),
      RUNS
    );
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme', maxLength: 60 }), (text) => {
        fc.pre(!text.includes('\uFFFD'));
        expect(renderMarkdown(text).includes('\uFFFD')).toBe(false);
      }),
      RUNS
    );
  });

  it('delimitBareUrls is idempotent: a second pass changes nothing', () => {
    fc.assert(
      fc.property(soup, (text) => {
        expect(delimitBareUrls(delimitBareUrls(text))).toBe(delimitBareUrls(text));
      }),
      RUNS
    );
  });

  it('leaves fenced code blocks and inline code spans byte-identical', () => {
    const codeContent = fc
      .array(
        fc.constantFrom(
          'const x = 1;',
          'https://example.com/inside-code',
          'a < b',
          '日本語のコメント',
          'return "https://foo.bar/";'
        ),
        { minLength: 1, maxLength: 4 }
      )
      .map((lines) => lines.join('\n'));
    fc.assert(
      fc.property(codeContent, (content) => {
        const doc = '```\n' + content + '\n```';
        expect(delimitBareUrls(doc)).toBe(doc);
      }),
      RUNS
    );
    fc.assert(
      fc.property(fc.constantFrom('https://example.com/inline', 'npm run build', 'x < y'), (content) => {
        const doc = '`' + content + '`';
        expect(delimitBareUrls(doc)).toBe(doc);
      }),
      { numRuns: 10 }
    );
  });

  it('leaves a finished link card byte-identical, URL in its text included', () => {
    const card =
      '<a class="link-card" href="https://example.com/page">' +
      '<span class="link-card-title">題</span>' +
      '<span class="link-card-desc">詳細は https://example.com/page を見よ</span></a>';
    expect(delimitBareUrls(card)).toBe(card);
  });

  it('leaves an already-delimited URL (markdown link) untouched', () => {
    fc.assert(
      fc.property(url, (u) => {
        expect(delimitBareUrls(`[リンク](${u})`)).toBe(`[リンク](${u})`);
      }),
      RUNS
    );
  });

  it('keeps URLs byte-identical through rendering: bare, linked and imaged', () => {
    fc.assert(
      fc.property(url, (u) => {
        expect(renderMarkdown(u)).toContain(`href="${u}"`);
        expect(renderMarkdown(`[リンク](${u})`)).toContain(`href="${u}"`);
        expect(renderMarkdown(`![写真](${u})`)).toContain(`src="${u}"`);
        // A bare URL glued to Japanese text links the URL only.
        expect(renderMarkdown(`詳しくは${u}を見てください`)).toContain(`href="${u}"`);
      }),
      RUNS
    );
  });

  it('boxes every generated lyric line verbatim and consumes the marker', () => {
    // wrapLyricsBlocks trims each line before boxing it, so the
    // generated lines are pre-trimmed; the alphabet avoids the
    // characters that would make a line stop being a lyric line.
    const lyricLine = fc
      .stringMatching(/^[ぁ-んァ-ヶ一-龠a-zA-Z0-9 ー・]{1,20}$/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const partLabel = fc.constantFrom('[Chorus]', '[サビ]', '[Verse]', '[間奏]');
    fc.assert(
      fc.property(fc.array(fc.oneof(lyricLine, partLabel), { minLength: 1, maxLength: 6 }), (lines) => {
        const doc = ['[[歌詞]]', ...lines, '## 次の見出し'].join('\n\n');
        const out = wrapLyricsBlocks(doc);
        expect(out).toContain('<div class="lyrics">');
        expect(out).not.toContain('[[歌詞]]');
        lines.forEach((line) => {
          const cls = /^\[[^\]]*\]$/.test(line) ? 'lyrics-part' : 'lyrics-line';
          expect(out).toContain(`<p class="${cls}">${line}</p>`);
        });
        expect(out).toContain('## 次の見出し');
      }),
      RUNS
    );
  });

  it('gives every heading a unique id and a matching table-of-contents entry', () => {
    const headingText = fc.constantFrom(
      '見出し', 'テスト', '川口の話', '障害対応', 'まとめ', 'Q&A', '2026年の計画'
    );
    fc.assert(
      fc.property(
        fc.array(fc.record({ depth: fc.constantFrom(2, 3), text: headingText }), {
          minLength: 1,
          maxLength: 6
        }),
        (headings) => {
          const md = headings.map((h) => `${'#'.repeat(h.depth)} ${h.text}`).join('\n\n');
          const html = renderMarkdown(md);
          const ids = [...html.matchAll(/id="(h-[0-9a-f]{8}(?:-\d+)?)"/g)].map((m) => m[1]);
          expect(ids.length).toBe(headings.length);
          expect(new Set(ids).size).toBe(ids.length);
          const toc = extractTocFromHtml(html);
          expect(toc.map((entry) => entry.text)).toEqual(headings.map((h) => h.text));
          expect(toc.map((entry) => entry.id)).toEqual(ids);
        }
      ),
      RUNS
    );
  });
});

// Documents built as blocks joined by exactly one blank line, with
// no marker blocks: the pre-parse rewrites must be the identity, so
// an article that uses no markers renders exactly as written.
const plainBlock = fc
  .array(
    fc.constantFrom('本文です', '次の段落に続きます', 'ただのテキスト', '短い行', '買い物リスト', 'a', '0'),
    { minLength: 1, maxLength: 3 }
  )
  .map((parts) => parts.join(' '));
const plainDoc = fc
  .array(plainBlock, { minLength: 0, maxLength: 6 })
  .map((blocks) => blocks.join('\n\n'));

describe('markdown pre-parse identity properties', () => {
  it('wrapLyricsBlocks changes nothing without a lyrics marker', () => {
    fc.assert(
      fc.property(plainDoc, (doc) => {
        expect(wrapLyricsBlocks(doc)).toBe(doc);
      }),
      RUNS
    );
  });

  it('expandAnchorMarkers changes nothing without an anchor marker', () => {
    fc.assert(
      fc.property(plainDoc, (doc) => {
        expect(expandAnchorMarkers(doc)).toBe(doc);
      }),
      RUNS
    );
  });
});
