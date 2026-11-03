import { marked } from 'marked';

// Hashes a heading's text into a short ASCII id (FNV-1a, 32-bit).
// Heading text itself is not used as the id: non-ASCII fragments do
// not scroll reliably in every browser (notably Safari/WebKit), so
// the id stays plain ASCII and the fragment URL is safe anywhere.
// The mapping is deterministic — the fragment for a heading is
// always "#" + hashHeadingText(heading text).
export const hashHeadingText = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `h-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

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

export const renderMarkdown = (markdown) => {
  const seen = new Map();
  const renderer = new marked.Renderer();
  renderer.link = (href, title, text) => {
    const titleAttr = title ? ` title="${title}"` : '';
    const target = opensInNewTab(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
  };
  renderer.heading = (text, level) => {
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
  return marked.parse(markdown ?? '', { renderer });
};
