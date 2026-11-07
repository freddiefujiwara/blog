// Tag data helpers.
//
// Tags come from a [[タグ：…]] marker in the source document. The API
// carries them alongside the article data, never inside the markdown:
//   - list / titles responses: `tags` is a map of article id -> tag list
//   - article response: `tags` is that article's own tag list
// Older payloads (cached lists saved before tags existed, or an older
// API deployment) have no `tags` at all; every helper here treats a
// missing or malformed value as "no tags" so the UI simply omits the
// chips and the tag index instead of failing.

// Normalizes one tag list: keeps non-empty strings, trimmed and
// de-duplicated, in their original order.
export const normalizeTagList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const tags = [];
  value.forEach((item) => {
    if (typeof item !== 'string') {
      return;
    }
    const tag = item.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  });
  return tags;
};

const isPlainMap = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Extracts the id -> tags map from a list or titles payload. Ids whose
// tag list normalizes to empty are left out.
export const extractTagsMap = (data) => {
  if (!isPlainMap(data) || !isPlainMap(data.tags)) {
    return {};
  }
  const map = {};
  Object.entries(data.tags).forEach(([id, value]) => {
    const tags = normalizeTagList(value);
    if (tags.length) {
      map[id] = tags;
    }
  });
  return map;
};

// Extracts the tag list from a single article response.
export const extractArticleTags = (article) => {
  if (!isPlainMap(article)) {
    return [];
  }
  return normalizeTagList(article.tags);
};

// Builds the tag index for the article list: one entry per tag that at
// least one listed article carries, with its article count. Sorted by
// count (descending), then by tag name, so the order is stable.
export const buildTagIndex = (articles, tagsMap) => {
  const counts = new Map();
  (Array.isArray(articles) ? articles : []).forEach((entry) => {
    const tags = tagsMap?.[entry?.id];
    if (!Array.isArray(tags)) {
      return;
    }
    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ja'));
};

// Filters article entries ({id, title}, newest first) down to those
// carrying the given tag, keeping the list order.
export const filterArticlesByTag = (articles, tagsMap, tag) => {
  if (!Array.isArray(articles) || !tag) {
    return [];
  }
  return articles.filter((entry) =>
    Array.isArray(tagsMap?.[entry?.id]) && tagsMap[entry.id].includes(tag)
  );
};

// Route path for a tag page. Tag names are Japanese text, so they are
// percent-encoded; vue-router decodes the param back on the page.
export const tagPath = (tag) => `/tag/${encodeURIComponent(tag)}`;
