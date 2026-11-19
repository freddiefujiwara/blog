import { mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import { tmpdir} from 'node:os';
import { join} from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
MAX_ARTICLES,
SHELL_LANGUAGES,
articleIdFromLink,
buildShellHtml,
decodeEntities,
descriptionFromMarkdown,
fetchArticleItems,
fetchTranslatedArticle,
fetchTranslatedTitles,
generateArticleShells,
stripLeadingDate,
translatedTitlesFromResponse,
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

it('言語シェルでは html lang と canonical・hreflang を差し込む', () => {
const alternates = [
{ hreflang: 'ja', href: 'https://freddiefujiwara.com/blog/ID_A'},
{ hreflang: 'en', href: 'https://freddiefujiwara.com/blog/en/ID_A'},
{ hreflang: 'x-default', href: 'https://freddiefujiwara.com/blog/ID_A'}
];
const html = buildShellHtml(TEMPLATE, {
title: 'Test Article',
description: 'English description',
url: 'https://freddiefujiwara.com/blog/en/ID_A',
imageUrl: 'https://freddiefujiwara.com/blog/ogp/ID_A.en.png',
lang: 'en',
canonicalUrl: 'https://freddiefujiwara.com/blog/en/ID_A',
alternates
});
expect(html).toContain('<html lang="en">');
expect(html).toContain(
'<link rel="canonical" href="https://freddiefujiwara.com/blog/en/ID_A" />'
);
expect(html).toContain(
'<link rel="alternate" hreflang="ja" href="https://freddiefujiwara.com/blog/ID_A" />'
);
expect(html).toContain(
'<link rel="alternate" hreflang="en" href="https://freddiefujiwara.com/blog/en/ID_A" />'
);
expect(html).toContain(
'<link rel="alternate" hreflang="x-default" href="https://freddiefujiwara.com/blog/ID_A" />'
);
});

it('言語指定が無ければ html lang もリンクも付けない（従来どおり）', () => {
const html = buildShellHtml(TEMPLATE, {
title: '記事タイトル',
description: '記事の説明',
url: 'https://freddiefujiwara.com/blog/ID_A',
imageUrl: 'https://freddiefujiwara.com/blog/ogp/ID_A.png'
});
expect(html).toContain('<html lang="ja">');
expect(html).not.toContain('hreflang');
expect(html).not.toContain('rel="canonical"');
});
});

describe('SHELL_LANGUAGES', () => {
it('英語と中国語（簡体字）の定義を持つ', () => {
expect(SHELL_LANGUAGES).toEqual([
{ code: 'en', htmlLang: 'en', hreflang: 'en'},
{ code: 'zh', htmlLang: 'zh-CN', hreflang: 'zh'}
]);
});
});

describe('translatedTitlesFromResponse', () => {
it('idをキーにしたオブジェクト形式を Map にする', () => {
const map = translatedTitlesFromResponse({
ids: ['ID_A', 'ID_B'],
titles: { ID_A: 'Title A', ID_B: 'Title B'}
});
expect(map.get('ID_A')).toBe('Title A');
expect(map.get('ID_B')).toBe('Title B');
expect(map.size).toBe(2);
});
it('ids と並行な配列形式も Map にする', () => {
const map = translatedTitlesFromResponse({
ids: ['ID_A', 'ID_B'],
titles: ['Title A', 'Title B']
});
expect(map.get('ID_B')).toBe('Title B');
});
it('使えるタイトルが無ければ null', () => {
expect(translatedTitlesFromResponse(null)).toBeNull();
expect(translatedTitlesFromResponse({})).toBeNull();
expect(translatedTitlesFromResponse({ ids: [], titles: {}})).toBeNull();
expect(translatedTitlesFromResponse({ png: 'base64' })).toBeNull();
});
});

describe('fetchTranslatedTitles / fetchTranslatedArticle', () => {
const API = 'https://example/api/exec';

it('タイトル一覧を取得して Map で返す', async () => {
const fetchImpl = vi.fn((url) => {
expect(url).toBe(`${API}?o=titles&lang=en`);
return Promise.resolve(jsonResponse({ ids: ['ID_A'], titles: { ID_A: 'Title A'}}));
});
const map = await fetchTranslatedTitles(API, 'en', fetchImpl);
expect(map.get('ID_A')).toBe('Title A');
});

it('タイトル一覧の取得に失敗したら null（言語を丸ごとスキップ）', async () => {
const httpError = vi.fn(() => Promise.resolve(jsonResponse(null, false, 500)));
expect(await fetchTranslatedTitles(API, 'en', httpError)).toBeNull();
const networkError = vi.fn(() => Promise.reject(new Error('boom')));
expect(await fetchTranslatedTitles(API, 'zh', networkError)).toBeNull();
});

it('翻訳記事を取得する。失敗や欠落は null', async () => {
const fetchImpl = vi.fn((url) => {
expect(url).toBe(`${API}?id=ID_A&lang=zh`);
return Promise.resolve(
jsonResponse({ id: 'ID_A', title: '测试文章', markdown: '中文正文'})
);
});
await expect(fetchTranslatedArticle(API, 'ID_A', 'zh', fetchImpl)).resolves.toEqual({
title: '测试文章',
markdown: '中文正文'
});
const failing = vi.fn(() => Promise.resolve(jsonResponse(null, false, 404)));
expect(await fetchTranslatedArticle(API, 'ID_A', 'en', failing)).toBeNull();
const incomplete = vi.fn(() => Promise.resolve(jsonResponse({ id: 'ID_A'})));
expect(await fetchTranslatedArticle(API, 'ID_A', 'en', incomplete)).toBeNull();
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
expect(MAX_ARTICLES).toBe(100);
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

describe('generateArticleShells（多言語シェル）', () => {
let dir;
beforeEach(async () => {
dir = await mkdtemp(join(tmpdir(), 'shells-i18n-'));
const { writeFile} = await import('node:fs/promises');
await writeFile(join(dir, 'index.html'), TEMPLATE);
});
afterEach(async () => {
await rm(dir, { recursive: true, force: true});
});

const API = 'https://example/api/exec';
const BASE = 'https://freddiefujiwara.com/blog/';
const LIST = {
ids: ['ID_A', 'ID_B'],
article_cache: [
{ id: 'ID_A', title: '2026-11-04 テスト記事', markdown: '## 見出しA\n本文Aです。'},
{ id: 'ID_B', title: '2026-11-03 もう一つの記事', markdown: '本文Bです。'}
]
};
const EN_TITLES = {
ids: ['ID_A', 'ID_B'],
titles: { ID_A: '2026-11-04 Test Article', ID_B: '2026-11-03 Another Article'}
};
const ZH_TITLES = {
ids: ['ID_A', 'ID_B'],
titles: { ID_A: '2026-11-04 测试文章', ID_B: '2026-11-03 另一篇文章'}
};
const EN_BODIES = {
ID_A: 'English body A.',
ID_B: 'English body B.'
};
const ZH_BODIES = {
ID_A: '中文正文A。',
ID_B: '中文正文B。'
};
const okImage = () =>
Promise.resolve({
ok: true,
json: () => Promise.resolve({ png: Buffer.from('PNGDATA').toString('base64')})
});

// overrides で各エンドポイントの応答を差し替えられるモック。
// キー: 'titles:en' / 'titles:zh' / 'article:<id>:<lang>' → 応答を返す関数
const i18nFetch = (overrides = {}) =>
vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(LIST));
for (const lang of ['en', 'zh']) {
if (url === `${API}?o=titles&lang=${lang}`) {
const override = overrides[`titles:${lang}`];
if (override) return override();
return Promise.resolve(
jsonResponse(lang === 'en'? EN_TITLES: ZH_TITLES)
);
}
const m = url.match(/\?id=(ID_[A-Z])&lang=(en|zh)$/);
if (m && url.startsWith(API)) {
const override = overrides[`article:${m[1]}:${m[2]}`];
if (override) return override();
const titles = m[2] === 'en'? EN_TITLES.titles: ZH_TITLES.titles;
const bodies = m[2] === 'en'? EN_BODIES: ZH_BODIES;
return Promise.resolve(
jsonResponse({ id: m[1], title: titles[m[1]], markdown: bodies[m[1]]})
);
}
}
return okImage();
});

it('英語・中国語のシェルとOGP画像も書き出す', async () => {
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl: i18nFetch(), log: () => {}}
);
expect(result).toEqual({ count: 2, fallbacks: 0});
expect((await readdir(join(dir, 'en'))).sort()).toEqual(['ID_A.html', 'ID_B.html']);
expect((await readdir(join(dir, 'zh'))).sort()).toEqual(['ID_A.html', 'ID_B.html']);
expect((await readdir(join(dir, 'ogp'))).sort()).toEqual([
'ID_A.en.png',
'ID_A.png',
'ID_A.zh.png',
'ID_B.en.png',
'ID_B.png',
'ID_B.zh.png'
]);

const en = await readFile(join(dir, 'en', 'ID_A.html'), 'utf8');
expect(en).toContain('<html lang="en">');
expect(en).toContain('<title>2026-11-04 Test Article</title>');
expect(en).toContain('<meta property="og:title" content="2026-11-04 Test Article" />');
expect(en).toContain('<meta property="og:description" content="English body A." />');
expect(en).toContain(`<meta property="og:url" content="${BASE}en/ID_A" />`);
expect(en).toContain(
`<meta property="og:image" content="${BASE}ogp/ID_A.en.png" />`
);
expect(en).toContain(`<link rel="canonical" href="${BASE}en/ID_A" />`);

const zh = await readFile(join(dir, 'zh', 'ID_A.html'), 'utf8');
expect(zh).toContain('<html lang="zh-CN">');
expect(zh).toContain('<meta property="og:title" content="2026-11-04 测试文章" />');
expect(zh).toContain(
`<meta property="og:image" content="${BASE}ogp/ID_A.zh.png" />`
);
expect(zh).toContain(`<link rel="canonical" href="${BASE}zh/ID_A" />`);
});

it('全シェルに実在する言語だけの hreflang を相互に付ける', async () => {
await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl: i18nFetch(), log: () => {}}
);
for (const path of ['ID_A.html', join('en', 'ID_A.html'), join('zh', 'ID_A.html')]) {
const shell = await readFile(join(dir, path), 'utf8');
expect(shell).toContain(
`<link rel="alternate" hreflang="ja" href="${BASE}ID_A" />`
);
expect(shell).toContain(
`<link rel="alternate" hreflang="en" href="${BASE}en/ID_A" />`
);
expect(shell).toContain(
`<link rel="alternate" hreflang="zh" href="${BASE}zh/ID_A" />`
);
expect(shell).toContain(
`<link rel="alternate" hreflang="x-default" href="${BASE}ID_A" />`
);
}
const ja = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(ja).not.toContain('rel="canonical"');
expect(ja).toContain('<html lang="ja">');
});

it('翻訳の説明文も日本語と同じ120字で切り詰める', async () => {
const fetchImpl = i18nFetch({
'article:ID_A:en': () =>
Promise.resolve(
jsonResponse({
id: 'ID_A',
title: '2026-11-04 Test Article',
markdown: 'word '.repeat(60)
})
)
});
await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl, log: () => {}}
);
const en = await readFile(join(dir, 'en', 'ID_A.html'), 'utf8');
const m = en.match(/<meta property="og:description" content="([^"]*)" \/>/);
expect(m).not.toBeNull();
expect(m[1]).toHaveLength(120);
});

it('タイトル一覧が取れない言語は丸ごとスキップし、残りの言語は作る', async () => {
const fetchImpl = i18nFetch({
'titles:en': () => Promise.resolve(jsonResponse(null, false, 500))
});
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl, log: () => {}}
);
expect(result.count).toBe(2);
await expect(readdir(join(dir, 'en'))).rejects.toThrow();
expect((await readdir(join(dir, 'zh'))).sort()).toEqual(['ID_A.html', 'ID_B.html']);
const ja = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(ja).toContain('hreflang="zh"');
expect(ja).not.toContain('hreflang="en"');
});

it('翻訳が日本語のまま返るバックエンドでは日本語シェルのみ（従来どおり）', async () => {
const jaTitles = {
ids: LIST.ids,
titles: {
ID_A: '2026-11-04 テスト記事',
ID_B: '2026-11-03 もう一つの記事'
}
};
const fetchImpl = vi.fn((url) => {
if (url === API) return Promise.resolve(jsonResponse(LIST));
if (url.includes('o=titles')) return Promise.resolve(jsonResponse(jaTitles));
if (url.includes('&lang=')) {
const id = new URL(url).searchParams.get('id');
const src = LIST.article_cache.find((a) => a.id === id);
return Promise.resolve(jsonResponse(src));
}
return okImage();
});
const result = await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl, log: () => {}}
);
expect(result.count).toBe(2);
const files = await readdir(dir);
expect(files).not.toContain('en');
expect(files).not.toContain('zh');
const ja = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(ja).not.toContain('hreflang');
expect(ja).not.toContain('rel="canonical"');
});

it('個別の翻訳取得に失敗した記事だけ、その言語のシェルを欠かす', async () => {
const fetchImpl = i18nFetch({
'article:ID_B:en': () => Promise.resolve(jsonResponse(null, false, 503)),
'article:ID_B:zh': () =>
Promise.resolve(
jsonResponse({
id: 'ID_B',
title: '2026-11-03 另一篇文章',
markdown: '本文Bです。' // 日本語のまま＝未翻訳として弾く
})
)
});
await generateArticleShells(
{ distDir: dir, apiUrl: API, baseUrl: BASE},
{ fetchImpl, log: () => {}}
);
expect((await readdir(join(dir, 'en'))).sort()).toEqual(['ID_A.html']);
expect((await readdir(join(dir, 'zh'))).sort()).toEqual(['ID_A.html']);
const jaB = await readFile(join(dir, 'ID_B.html'), 'utf8');
expect(jaB).not.toContain('hreflang');
const jaA = await readFile(join(dir, 'ID_A.html'), 'utf8');
expect(jaA).toContain('hreflang="en"');
expect(jaA).toContain('hreflang="zh"');
});
});
