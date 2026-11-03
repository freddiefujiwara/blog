import { marked } from 'marked';

// Renders an article's markdown to HTML. Headings receive an id
// derived from their text, so another part of the same article (for
// example an overview list near the top) can link straight to a
// section with a fragment URL:
//   [障害1：…](#障害1：…)
// Ids are unique within one article: the second and later headings
// with the same text gain a "-2", "-3", ... suffix.
export const renderMarkdown = (markdown) => {
  const seen = new Map();
  const renderer = new marked.Renderer();
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
    const id = (count === 1 ? plain : `${plain}-${count}`).replace(
      /"/g,
      '&quot;'
    );
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };
  return marked.parse(markdown ?? '', { renderer });
};
