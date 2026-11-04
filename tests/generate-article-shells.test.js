import { mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import { tmpdir} from 'node:os';
import { join} from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
MAX_ARTICLES,
articleIdFromLink,
buildShellHtml,
decodeEntities,
descriptionFromMarkdown,
fetchArticleItems,
generateArticleShells,
stripLeadingDate,
truncateDescription
} from '../scripts/generate-article-shells.mjs';

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

const jsonResponse = (body, ok = true, status = 200) => ({
ok,
status,
json: () => Promise.resolve(body)
});

describe('stripLeadingDate', () => {
it('先頭の日付と空白を取り除く', () => {
expect(stripLeadingDate('2026-11-04 テスト記事')).toBe('テスト記事');
});
it('日付の直後に空白がない場合も取り除く', () => {
expect(stripLeadingDate('2026-11-02AIの話')).toBe('AIの話');
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

describe('descriptionFromMarkdown', () => {
it('見出し記号を外し、改行を空白に畳む', () => {
expect(descriptionFromMarkdown('## 見出し\n\n本文です。\n次の行。')).toBe(
'見出し 本文です。 次の行。'
);
});
it('リンクはテキストだけ残し、画像は除去する', () => {
expect(
descriptionFromMarkdown(
'冒頭に[リンク文字](https://example.com)があり、![代替テキスト](https://example.com/a.png)画像は消える。'
)
).toBe('冒頭にリンク文字があり、画像は消える。');
});
it('強調・コード・引用・HTMLタグを取り除く', () => {
expect(descriptionFromMarkdown('**太字** と *斜体* と `code` です')).toBe(
'太字 と 斜体 と code です'
);
expect(descriptionFromMarkdown('> 引用文\n<p>段落</p>タグ')).toBe('引用文 段落タグ');
});
it('空やnullでも例外なく空文字を返す', () => {
expect(descriptionFromMarkdown('')).toBe('');
expect(descriptionFromMarkdown(null)).toBe('');
expect(descriptionFromMarkdown(undefined)).toBe('');
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

describe('fetchArticleItems', () => {
const API = 'https://example/api/exec';

it('キャッシュ分はそのまま、無い分だけ個別取得する', async () => {
const list = {
ids: ['ID_A', 'ID_B', 'ID_C'],
article_cache: [
{ id: 'ID_A', title: 'タイトルA', markdown: '# A\n本文A'},
{ id: 'ID_B', title: 'タイトルB', markdown: '本文B'}
]
};
const fetchImpl = vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(list));
if (url === `${API}?id=ID_C`)
return Promise.resolve(jsonResponse({ id: 'ID_C', title: 'タイトルC', markdown: '本文C'}));
return Promise.reject(new Error(`unexpected url: ${url}`));
});
const items = await fetchArticleItems(API, fetchImpl);
expect(items.map((i) => i.id)).toEqual(['ID_A', 'ID_B', 'ID_C']);
expect(items[2]).toEqual({ id: 'ID_C', title: 'タイトルC', markdown: '本文C'});
expect(fetchImpl).toHaveBeenCalledTimes(2); // 一覧 + ID_C の個別取得だけ
});

it('新しい順に MAX_ARTICLES 件で打ち切る', async () => {
const ids = Array.from({ length: MAX_ARTICLES + 10}, (_, i) => `ID_${i}`);
const list = {
ids,
article_cache: ids
.slice(0, 10)
.map((id) => ({ id, title: `タイトル${id}`, markdown: `本文${id}`}))
};
const fetched = [];
const fetchImpl = vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(list));
const id = new URL(url).searchParams.get('id');
fetched.push(id);
return Promise.resolve(jsonResponse({ id, title: `タイトル${id}`, markdown: `本文${id}`}));
});
const items = await fetchArticleItems(API, fetchImpl);
expect(MAX_ARTICLES).toBe(50);
expect(items).toHaveLength(MAX_ARTICLES);
expect(items.at(-1).id).toBe(`ID_${MAX_ARTICLES - 1}`);
expect(fetched).not.toContain(`ID_${MAX_ARTICLES}`);
});

it('個別取得に失敗した記事と、項目が欠けた記事はスキップする', async () => {
const list = {
ids: ['ID_A', 'ID_B', 'ID_C', 'ID_D'],
article_cache: [{ id: 'ID_A', title: 'タイトルA', markdown: '本文A'}]
};
const fetchImpl = vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(list));
if (url.includes('id=ID_B')) return Promise.resolve(jsonResponse(null, false, 500));
if (url.includes('id=ID_C')) return Promise.reject(new Error('network error'));
if (url.includes('id=ID_D')) return Promise.resolve(jsonResponse({ id: 'ID_D'}));
return Promise.reject(new Error(`unexpected url: ${url}`));
});
const items = await fetchArticleItems(API, fetchImpl);
expect(items.map((i) => i.id)).toEqual(['ID_A']);
});

it('一覧の取得に失敗したら例外', async () => {
const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse(null, false, 503)));
await expect(fetchArticleItems(API, fetchImpl)).rejects.toThrow(/Article list fetch failed/);
});
});

describe('generateArticleShells', () => {
let dir;
beforeEach(async () => {
dir = await mkdtemp(join(tmpdir(), 'shells-'));
const { writeFile} = await import('node:fs/promises');
await writeFile(join(dir, 'index.html'), TEMPLATE);
});
afterEach(async () => {
await rm(dir, { recursive: true, force: true});
});

const API = 'https://example/api/exec';
const LIST = {
ids: ['ID_A', 'ID_B', 'ID_C'],
article_cache: [
{ id: 'ID_A', title: '2026-11-04 テスト記事', markdown: '## 見出しA\n本文Aです。'},
{ id: 'ID_B', title: '2026-11-03 もう一つの記事', markdown: '本文Bです。'}
]
};
const okImage = () =>
Promise.resolve({
ok: true,
json: () => Promise.resolve({ png: Buffer.from('PNGDATA').toString('base64')})
});
const apiFetch = (imageImpl) =>
vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(LIST));
if (url === `${API}?id=ID_C`)
return Promise.resolve(
jsonResponse({ id: 'ID_C', title: '2026-11-02 個別取得の記事', markdown: '本文Cです。'})
);
return imageImpl();
});

it('記事一覧の全記事分のシェルと画像を書き出す', async () => {
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: 'https://freddiefujiwara.com/blog/'},
{ fetchImpl: apiFetch(okImage), log: () => {}}
);
expect(result).toEqual({ count: 3, fallbacks: 0});
const files = await readdir(dir);
expect(files).toContain('ID_A.html');
expect(files).toContain('ID_B.html');
expect(files).toContain('ID_C.html');
const images = await readdir(join(dir, 'ogp'));
expect(images.sort()).toEqual(['ID_A.png', 'ID_B.png', 'ID_C.png']);
const shell = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(shell).toContain('og:image" content="https://freddiefujiwara.com/blog/ogp/ID_A.png"');
expect(shell).toContain('og:url" content="https://freddiefujiwara.com/blog/ID_A"');
expect(shell).toContain('og:description" content="見出しA 本文Aです。"');
});

it('画像生成が失敗した記事は共通画像にフォールバックする', async () => {
const fetchImpl = apiFetch(() => Promise.resolve({ ok: false, status: 500}));
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: 'https://freddiefujiwara.com/blog/'},
{ fetchImpl, log: () => {}}
);
expect(result.count).toBe(3);
expect(result.fallbacks).toBe(3);
const shell = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(shell).toContain('og:image" content="https://freddiefujiwara.com/blog/ogp.png"');
});

it('記事一覧が0件なら例外（allow-emptyのときだけ素通り）', async () => {
const fetchImpl = vi.fn(() =>
Promise.resolve(jsonResponse({ ids: [], article_cache: []}))
);
await expect(
generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: 'https://x/'},
{ fetchImpl, log: () => {}}
)
).rejects.toThrow(/Article list has no items/);
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: 'https://x/', allowEmpty: true},
{ fetchImpl, log: () => {}}
);
expect(result.count).toBe(0);
});
});
