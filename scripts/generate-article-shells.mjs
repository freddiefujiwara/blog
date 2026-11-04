// Generate per-article HTML shells with article-specific OGP meta tags.
//
// The blog is an SPA: SNS crawlers do not run JavaScript, so they only ever
// see the site-wide OGP in index.html. For every article in the blog's
// article list this script writes <distDir>/<article-id>.html — a copy of
// the built index.html whose OGP meta (title / description / url / image)
// describes that article — plus a per-article OGP image rendered by
// ogp-png-gas. GitHub Pages serves <id>.html at the extensionless
// /blog/<id> URL, so no URL changes. The app itself boots from the shell
// exactly as before and the article body stays fully dynamic.
//
// The source is the article list API (the blog-gas /exec endpoint with no
// parameters): it returns every article id, newest first, plus the newest
// 10 articles with their markdown; the remaining articles are fetched one
// by one via?id=. Up to the newest MAX_ARTICLES articles get shells —
// including an article published today, as soon as it appears in the list
// (the backend list cache refreshes at most every 10 minutes). Articles
// beyond the cap simply get no shell and keep the site-wide OGP via the
// 404 fallback — no regression.
//
// Usage:
// node scripts/generate-article-shells.mjs <distDir> <apiUrl> <baseUrl> [--allow-empty]
// apiUrl is the plain /exec URL of blog-gas (no query string), e.g.
// https://script.google.com/macros/s/<id>/exec
// baseUrl is the published base of this build, e.g.
// https://freddiefujiwara.com/blog/ or.../blog/staging/
// A failed/empty article list aborts the deploy (unless --allow-empty) so
// a backend hiccup never wipes the shells that are already published.

import { mkdir, readFile, writeFile} from 'node:fs/promises';
import { join} from 'node:path';
import { pathToFileURL} from 'node:url';

export const OGP_IMAGE_API_URL =
'https://script.google.com/macros/s/AKfycbzbMAKxkzHlwN8SY7ygJA34xYESMNNdkGNt8vv1XMcZSksgHsUwOxCCdP-wgg6fv7M/exec';

const IMAGE_CONCURRENCY = 4;

// How many of the newest articles get shells. Matches the old RSS feed
// limit so the set of shelled articles does not shrink with the switch.
export const MAX_ARTICLES = 50;

export const decodeEntities = (s) =>
s
.replace(/&lt;/g, '<')
.replace(/&gt;/g, '>')
.replace(/&quot;/g, '"')
.replace(/&apos;/g, "'")
.replace(/&#39;/g, "'")
.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
.replace(/&amp;/g, '&');

// Article titles start with their publication date ("2026-11-02..." or
// "2026-11-02"). The date adds little on a share card, so the OGP
// image is rendered without it. Only the image text is affected — the
// og:title metadata and the article itself keep the full title.
export const stripLeadingDate = (title) => title.replace(/^\d{4}-\d{2}-\d{2}\s*/, '');

export const articleIdFromLink = (link) => link.replace(/\/+$/, '').split('/').pop()?? '';

export const truncateDescription = (text, max = 120) => {
const flat = (text?? '').replace(/\s+/g, ' ').trim();
return flat.length > max? flat.slice(0, max): flat;
};

// Flattens markdown to plain text for og:description. Only formatting is
// removed here; the length cap is truncateDescription's job.
export const descriptionFromMarkdown = (markdown) =>
(markdown?? '')
.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
.replace(/<[^>]*>/g, '')
.replace(/^#{1,6}\s*/gm, '')
.replace(/^>\s?/gm, '')
.replace(/\*\*/g, '')
.replace(/\*/g, '')
.replace(/`/g, '')
.replace(/\s+/g, ' ')
.trim();

export const escapeAttr = (s) =>
s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const replaceMeta = (html, attr, key, value) => {
const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
if (!re.test(html)) throw new Error(`template is missing <meta ${attr}="${key}">`);
return html.replace(re, `$1${escapeAttr(value)}$2`);
};

export const buildShellHtml = (template, { title, description, url, imageUrl}) => {
let html = template;
const titleTag = /<title>[\s\S]*?<\/title>/;
if (!titleTag.test(html)) throw new Error('template is missing <title>');
html = html.replace(titleTag, `<title>${escapeAttr(title)}</title>`);
html = replaceMeta(html, 'property', 'og:title', title);
html = replaceMeta(html, 'property', 'og:description', description);
html = replaceMeta(html, 'property', 'og:type', 'article');
html = replaceMeta(html, 'property', 'og:url', url);
html = replaceMeta(html, 'property', 'og:image', imageUrl);
html = replaceMeta(html, 'name', 'twitter:image', imageUrl);
return html;
};

export const fetchOgpImage = async (title, fetchImpl = fetch) => {
const url = `${OGP_IMAGE_API_URL}?t=${encodeURIComponent(title)}`;
const res = await fetchImpl(url);
if (!res.ok) throw new Error(`OGP image fetch failed: HTTP ${res.status}`);
const data = await res.json();
if (!data.png) throw new Error('OGP image response has no png field');
return Buffer.from(data.png, 'base64');
};

// Runs worker over items with a small concurrency cap.
const mapWithConcurrency = async (items, limit, worker) => {
const results = new Array(items.length);
let next = 0;
const runners = Array.from({ length: Math.min(limit, items.length)}, async () => {
while (next < items.length) {
const i = next++;
results[i] = await worker(items[i]);
}
});
await Promise.all(runners);
return results;
};

// Fetches the newest MAX_ARTICLES articles as {id, title, markdown} in
// list order. The list response carries the newest articles' markdown in
// article_cache; the rest are fetched individually. An article whose
// individual fetch fails (or comes back without title/markdown) is
// skipped rather than sinking the whole run.
export const fetchArticleItems = async (apiUrl, fetchImpl = fetch) => {
const res = await fetchImpl(apiUrl);
if (!res.ok) throw new Error(`Article list fetch failed: HTTP ${res.status}`);
const data = await res.json();
const ids = Array.isArray(data?.ids)? data.ids: [];
const cache = new Map(
(Array.isArray(data?.article_cache)? data.article_cache: [])
.filter((a) => a && a.id)
.map((a) => [a.id, a])
);
const sep = apiUrl.includes('?')? '&': '?';
const items = await mapWithConcurrency(ids.slice(0, MAX_ARTICLES), 4, async (id) => {
const cached = cache.get(id);
if (cached && cached.title && cached.markdown) {
return { id, title: cached.title, markdown: cached.markdown};
}
try {
const r = await fetchImpl(`${apiUrl}${sep}id=${encodeURIComponent(id)}`);
if (!r.ok) return null;
const art = await r.json();
if (!art ||!art.title ||!art.markdown) return null;
return { id, title: art.title, markdown: art.markdown};
} catch {
return null;
}
});
return items.filter((item) => item!== null);
};

export const generateArticleShells = async (
{ distDir, apiUrl, baseUrl, allowEmpty = false},
{ fetchImpl = fetch, log = console.log} = {}
) => {
const items = await fetchArticleItems(apiUrl, fetchImpl);
if (items.length === 0) {
if (!allowEmpty) {
throw new Error('Article list has no items; aborting so existing shells are kept');
}
log('Article list has no items; no shells generated (allow-empty)');
return { count: 0, fallbacks: 0};
}

const template = await readFile(join(distDir, 'index.html'), 'utf8');
const ogpDir = join(distDir, 'ogp');
await mkdir(ogpDir, { recursive: true});

let fallbacks = 0;
await mapWithConcurrency(items, IMAGE_CONCURRENCY, async (item) => {
let imageUrl = `${baseUrl}ogp/${item.id}.png`;
try {
const png = await fetchOgpImage(stripLeadingDate(item.title), fetchImpl);
await writeFile(join(ogpDir, `${item.id}.png`), png);
} catch (err) {
// One bad image must not sink the whole deploy: fall back to the
// site-wide OGP image for this article.
fallbacks++;
log(`OGP image failed for ${item.id} (${err.message}); using fallback image`);
imageUrl = `${baseUrl}ogp.png`;
}
const html = buildShellHtml(template, {
title: item.title,
description: truncateDescription(descriptionFromMarkdown(item.markdown)),
url: `${baseUrl}${item.id}`,
imageUrl
});
await writeFile(join(distDir, `${item.id}.html`), html);
});

log(`Generated ${items.length} article shells (${fallbacks} image fallbacks)`);
return { count: items.length, fallbacks};
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
const args = process.argv.slice(2).filter((a) => a!== '--allow-empty');
const allowEmpty = process.argv.includes('--allow-empty');
const [distDir, apiUrl, baseUrl] = args;
if (!distDir ||!apiUrl ||!baseUrl) {
console.error(
'Usage: node scripts/generate-article-shells.mjs <distDir> <apiUrl> <baseUrl> [--allow-empty]'
);
process.exit(1);
}
generateArticleShells({ distDir, apiUrl, baseUrl, allowEmpty}).catch((err) => {
console.error(err.message);
process.exit(1);
});
}
