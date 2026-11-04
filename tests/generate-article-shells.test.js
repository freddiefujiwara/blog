import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  articleIdFromLink,
  buildShellHtml,
  decodeEntities,
  generateArticleShells,
  parseRssItems,
  stripLeadingDate,
  truncateDescription
} from '../scripts/generate-article-shells.mjs';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog</title>
    <item>
      <title>2026-11-04 テスト &amp; 記事</title>
      <link>https://freddiefujiwara.com/blog/ID_A</link>
      <description>冒頭の文です。
二行目もあります。</description>
    </item>
    <item>
      <title>2026-11-03 もう一つの記事</title>
      <link>https://freddiefujiwara.com/blog/ID_B</link>
      <description>説明 &apos;引用&apos; あり</description>
    </item>
  </channel>
</rss>`;

const TEMPLATE = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta property="og:title" content="サイト共通タイトル" />
    <meta property="og:description" content="サイト共通の説明" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://freddiefujiwara.com/blog/" />
    <meta property="og:image" content="https://freddiefujiwara.com/blog/ogp.png" />
    <meta name="twitter:image" content="https://freddiefujiwara.com/blog/ogp.png" />
    <title>サイト共通タイトル</title>
  </head>
  <body><div id="app"></div></body>
</html>`;

describe('stripLeadingDate', () => {
  it('先頭の日付と空白を取り除く', () => {
    expect(stripLeadingDate('2026-11-04 テスト記事')).toBe('テスト記事');
  });
  it('日付の直後に空白がない場合も取り除く', () => {
    expect(stripLeadingDate('2026-11-02【招待コード有】AIの話')).toBe('【招待コード有】AIの話');
  });
  it('日付で始まらないタイトルはそのまま', () => {
    expect(stripLeadingDate('日付なしの記事')).toBe('日付なしの記事');
    expect(stripLeadingDate('あと2026-11-02の話')).toBe('あと2026-11-02の話');
  });
});

describe('decodeEntities', () => {
  it('主要な実体参照を戻す', () => {
    expect(decodeEntities('a &amp; b &apos;c&apos; &lt;d&gt;')).toBe("a & b 'c' <d>");
  });
});

describe('parseRssItems', () => {
  it('itemからid・タイトル・リンク・説明を取り出す', () => {
    const items = parseRssItems(RSS);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'ID_A',
      title: '2026-11-04 テスト & 記事',
      link: 'https://freddiefujiwara.com/blog/ID_A'
    });
    expect(items[0].description).toContain('冒頭の文です');
    expect(items[1].description).toBe("説明 '引用' あり");
  });

  it('itemがなければ空配列', () => {
    expect(parseRssItems('<rss><channel></channel></rss>')).toEqual([]);
  });
});

describe('articleIdFromLink', () => {
  it('末尾のパス要素を返す', () => {
    expect(articleIdFromLink('https://freddiefujiwara.com/blog/XYZ')).toBe('XYZ');
    expect(articleIdFromLink('https://freddiefujiwara.com/blog/XYZ/')).toBe('XYZ');
  });
});

describe('truncateDescription', () => {
  it('改行を空白に畳んで120字で切る', () => {
    expect(truncateDescription('一行目\n二行目')).toBe('一行目 二行目');
    expect(truncateDescription('あ'.repeat(200))).toHaveLength(120);
  });
});

describe('buildShellHtml', () => {
  it('OGPメタとタイトルを記事のものに差し替える', () => {
    const html = buildShellHtml(TEMPLATE, {
      title: '記事タイトル',
      description: '記事の説明',
      url: 'https://freddiefujiwara.com/blog/ID_A',
      imageUrl: 'https://freddiefujiwara.com/blog/ogp/ID_A.png'
    });
    expect(html).toContain('<title>記事タイトル</title>');
    expect(html).toContain('<meta property="og:title" content="記事タイトル" />');
    expect(html).toContain('<meta property="og:description" content="記事の説明" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<meta property="og:url" content="https://freddiefujiwara.com/blog/ID_A" />');
    expect(html).toContain('<meta property="og:image" content="https://freddiefujiwara.com/blog/ogp/ID_A.png" />');
    expect(html).toContain('<meta name="twitter:image" content="https://freddiefujiwara.com/blog/ogp/ID_A.png" />');
    expect(html).not.toContain('サイト共通タイトル');
  });

  it('テンプレートに必要なメタが無ければ例外', () => {
    expect(() =>
      buildShellHtml('<html><head><title>x</title></head></html>', {
        title: 't',
        description: 'd',
        url: 'u',
        imageUrl: 'i'
      })
    ).toThrow();
  });
});

describe('generateArticleShells', () => {
  let dir;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'shells-'));
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(dir, 'index.html'), TEMPLATE);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const okImage = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ png: Buffer.from('PNGDATA').toString('base64') })
    });
  const rssResponse = (body) => ({ ok: true, text: () => Promise.resolve(body) });

  it('RSSの全記事分のシェルと画像を書き出す', async () => {
    const fetchImpl = vi.fn((url) => {
      if (String(url).includes('o=rss')) return Promise.resolve(rssResponse(RSS));
      return okImage();
    });
    const result = await generateArticleShells(
      { distDir: dir, rssUrl: 'https://example/rss?o=rss', baseUrl: 'https://freddiefujiwara.com/blog/' },
      { fetchImpl, log: () => {} }
    );
    expect(result).toEqual({ count: 2, fallbacks: 0 });
    const files = await readdir(dir);
    expect(files).toContain('ID_A.html');
    expect(files).toContain('ID_B.html');
    const images = await readdir(join(dir, 'ogp'));
    expect(images.sort()).toEqual(['ID_A.png', 'ID_B.png']);
    const shell = await readFile(join(dir, 'ID_A.html'), 'utf8');
    expect(shell).toContain('og:image" content="https://freddiefujiwara.com/blog/ogp/ID_A.png"');
  });

  it('画像生成が失敗した記事は共通画像にフォールバックする', async () => {
    const fetchImpl = vi.fn((url) => {
      if (String(url).includes('o=rss')) return Promise.resolve(rssResponse(RSS));
      return Promise.resolve({ ok: false, status: 500 });
    });
    const result = await generateArticleShells(
      { distDir: dir, rssUrl: 'https://example/rss?o=rss', baseUrl: 'https://freddiefujiwara.com/blog/' },
      { fetchImpl, log: () => {} }
    );
    expect(result.count).toBe(2);
    expect(result.fallbacks).toBe(2);
    const shell = await readFile(join(dir, 'ID_A.html'), 'utf8');
    expect(shell).toContain('og:image" content="https://freddiefujiwara.com/blog/ogp.png"');
  });

  it('RSSが0件なら例外（allow-emptyのときだけ素通り）', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(rssResponse('<rss><channel></channel></rss>')));
    await expect(
      generateArticleShells(
        { distDir: dir, rssUrl: 'https://example/rss?o=rss', baseUrl: 'https://x/' },
        { fetchImpl, log: () => {} }
      )
    ).rejects.toThrow();
    const result = await generateArticleShells(
      { distDir: dir, rssUrl: 'https://example/rss?o=rss', baseUrl: 'https://x/', allowEmpty: true },
      { fetchImpl, log: () => {} }
    );
    expect(result.count).toBe(0);
  });
});
