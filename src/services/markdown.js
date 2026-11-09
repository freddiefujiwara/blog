import { marked } from 'marked';

// Hashes a text into a short ASCII id (FNV-1a, 32-bit). The text
// itself is not used as the id: non-ASCII fragments do not scroll
// reliably in every browser (notably Safari/WebKit), so the id stays
// plain ASCII and the fragment URL is safe anywhere. The mapping is
// deterministic — the fragment for a text is always the same.
const fnv1aHex = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const hashHeadingText = (text) => `h-${fnv1aHex(text)}`;

// Item titles — a bold-only paragraph right after an image paragraph,
// the shape list-style articles use for each entry — receive an anchor
// id hashed from the title text, so one entry can be shared with a
// fragment URL: /blog/<articleId>#item-xxxxxxxx
export const hashItemText = (text) => `item-${fnv1aHex(text)}`;

// Renders an article's markdown to HTML. Headings receive the
// hashed id of their text, so another part of the same article (for
// example an overview list near the top) can link straight to a
// section with a fragment URL:
//   [障害1：…](#h-xxxxxxxx)
// Ids are unique within one article: the second and later headings
// with the same text gain a "-2", "-3", ... suffix.
// Link targets inside an article: destinations under /blog keep the
// reader circulating within the blog, so they stay in the same tab.
// Everything else (other apps on this site, external sites) opens in
// a new tab, so the article itself stays open. Fragment links jump
// within the page and non-web links (mailto: and friends) are left
// exactly as they are.
export const isBlogInternalUrl = (href) => {
  if (!href) return false;
  if (href === '/blog' || href.startsWith('/blog/')) return true;
  return /^https?:\/\/freddiefujiwara\.com\/blog(\/|$)/.test(href);
};

export const opensInNewTab = (href) => {
  if (!href || href.startsWith('#')) return false;
  if (isBlogInternalUrl(href)) return false;
  return /^https?:\/\//i.test(href) || href.startsWith('/');
};

// Bare URLs written directly into the text are a hazard in Japanese
// articles: the parser's own autolink keeps consuming characters
// until it meets whitespace, so a URL placed right against Japanese
// text (no space after it) swallows the rest of the sentence into
// the link. Pin bare URLs down before parsing by wrapping them in
// <...>, which limits the link to the ASCII URL characters only.
// A URL that already has a delimiter is left untouched: Markdown
// link destinations (preceded by "("), link text inside "[...]",
// <...> autolinks, and HTML attribute values (preceded by a quote
// or "="). URLs inside code spans and fenced code blocks are also
// left exactly as written.
const BARE_URL_PATTERN = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&*+,;=%]+/g;
const DELIMITED_PRECEDERS = new Set(['(', '[', '<', '"', "'", '=']);
const CODE_SEGMENT_PATTERN = /(```[\s\S]*?(?:```|$)|`[^`\n]+`)/g;

const wrapBareUrls = (text) => text.replace(BARE_URL_PATTERN, (match, offset, source) => {
  const prev = offset > 0 ? source[offset - 1] : '';
  if (DELIMITED_PRECEDERS.has(prev)) return match;
  const url = match.replace(/[.,;:!?]+$/, '');
  return `<${url}>${match.slice(url.length)}`;
});

export const delimitBareUrls = (markdown) => String(markdown ?? '')
  .split(CODE_SEGMENT_PATTERN)
  .map((segment, index) => (index % 2 === 1 ? segment : wrapBareUrls(segment)))
  .join('');

// Builds an article's table of contents from its rendered HTML.
// Reading the entries back out of the rendered markup guarantees the
// ids match the heading anchors exactly (including the "-2" suffixes
// renderMarkdown gives repeated headings), however the heading text
// was marked up. Only ## and ### sections are listed.
export const extractTocFromHtml = (html) => {
  const toc = [];
  const pattern = /<h([23]) id="(h-[0-9a-f]{8}(?:-\d+)?)">([\s\S]*?)<\/h\1>/g;
  let match;
  while ((match = pattern.exec(String(html ?? ''))) !== null) {
    const text = match[3]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (text) {
      toc.push({ level: Number(match[1]), id: match[2], text });
    }
  }
  return toc;
};

// An author can choose where the table of contents appears by putting
// a paragraph that contains only this marker in the document (the
// full-width bracket variant is accepted too). Several markers may be
// used; the TOC box appears at each of them. Without a marker the
// TOC sits right under the title, as before. The marker paragraph is
// never shown to readers.
const TOC_MARKER_PATTERN = /<p>(?:\[\[目次\]\]|［［目次］］)<\/p>/;

// Splits the article HTML at every [[目次]] marker paragraph and
// returns the pieces in order, or null when the document carries no
// marker. The caller renders the (whole-article) table of contents
// between the pieces, so an article can show its TOC at several
// spots — for example at the top of every section of a long list.
export const splitHtmlAtTocMarkers = (html) => {
  const parts = String(html ?? '').split(new RegExp(TOC_MARKER_PATTERN.source, 'g'));
  return parts.length > 1 ? parts : null;
};

// Lyrics blocks: an article can present a song's lyrics as a boxed
// sheet by putting a paragraph that is only "**歌詞**" followed by
// one paragraph per lyric line. The block is rewritten here — before
// parsing — into a raw HTML box, because Markdown itself has no
// grouping for it. The lines are consumed until the block can no
// longer be a lyric line: a heading, a raw HTML block (the music
// player placeholders, link cards), a Markdown link or marker line,
// a long paragraph, or a sentence ending in "。" — prose paragraphs
// (a section's introduction, an article's closing line) end lyrics
// instead of being boxed in. Bracketed part labels ("[Chorus]")
// become muted part headings inside the box.
const LYRICS_LABEL = '**歌詞**';
const LYRICS_PART_PATTERN = /^\[[^\]]*\]$/;

const escapeHtmlText = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const isLyricLine = (block) => {
  if (!block || block.length > 40) return false;
  if (block.startsWith('#')) return false;
  if (block.startsWith('<')) return false;
  if (block.startsWith('[[')) return false;
  if (block.includes('](')) return false;
  if (block.endsWith('。')) return false;
  return true;
};

export const wrapLyricsBlocks = (markdown) => {
  const blocks = String(markdown ?? '').split(/\n{2,}/);
  const out = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].trim() !== LYRICS_LABEL) {
      out.push(blocks[i]);
      i += 1;
      continue;
    }
    const lines = [];
    let j = i + 1;
    while (j < blocks.length && isLyricLine(blocks[j].trim())) {
      lines.push(blocks[j].trim());
      j += 1;
    }
    if (!lines.length) {
      out.push(blocks[i]);
      i += 1;
      continue;
    }
    const inner = lines.map((line) => (LYRICS_PART_PATTERN.test(line)
      ? `<p class="lyrics-part">${escapeHtmlText(line)}</p>`
      : `<p class="lyrics-line">${escapeHtmlText(line)}</p>`)).join('');
    out.push(`<div class="lyrics"><p class="lyrics-label">歌詞</p>${inner}</div>`);
    i = j;
  }
  return out.join('\n\n');
};

export const renderMarkdown = (markdown) => {
  const seen = new Map();
  const seenItems = new Map();
  let prevWasImageOnly = false;
  const renderer = new marked.Renderer();
  renderer.link = (href, title, text) => {
    const titleAttr = title ? ` title="${title}"` : '';
    const target = opensInNewTab(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
  };
  renderer.heading = (text, level) => {
    prevWasImageOnly = false;
    const plain = text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    const count = (seen.get(plain) ?? 0) + 1;
    seen.set(plain, count);
    const base = hashHeadingText(plain);
    const id = count === 1 ? base : `${base}-${count}`;
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };
  // A bold-only paragraph right after an image-only paragraph is an
  // item title (see hashItemText): give its <p> the hashed anchor id
  // so the entry can be linked directly. Any other paragraph keeps
  // the default rendering and breaks the image -> title sequence.
  renderer.paragraph = (text) => {
    const trimmed = text.trim();
    const imageOnly = /^<img\b[^>]*>$/.test(trimmed);
    if (prevWasImageOnly && !imageOnly) {
      const match = trimmed.match(/^<strong>([^<]+)<\/strong>$/);
      if (match) {
        const plain = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        const count = (seenItems.get(plain) ?? 0) + 1;
        seenItems.set(plain, count);
        const base = hashItemText(plain);
        const id = count === 1 ? base : `${base}-${count}`;
        prevWasImageOnly = false;
        return `<p id="${id}">${text}</p>\n`;
      }
    }
    prevWasImageOnly = imageOnly;
    return `<p>${text}</p>\n`;
  };
  const html = marked.parse(wrapLyricsBlocks(delimitBareUrls(markdown ?? '')), { renderer });
  return appendItemLinks(html);
};

// Every item title gains a small link line under it — under the
// 「目標：…」 meta line when the item has one, otherwise directly
// under the title — so a reader can pick up the entry's own fragment
// URL from the page itself: tapping the link puts the fragment in
// the address bar, ready to copy and share.
const ITEM_LINK_PATTERN = /(<p id="(item-[0-9a-f]{8}(?:-\d+)?)">[\s\S]*?<\/p>\n(?:<p>目標：[\s\S]*?<\/p>\n)?)/g;

export const appendItemLinks = (html) => String(html ?? '').replace(
  ITEM_LINK_PATTERN,
  (whole, block, id) => `${block}<p class="item-link"><a href="#${id}">この項目へのリンク</a></p>\n`
);
