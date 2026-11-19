import { isStagingBuild } from '../staging-banner';

// Production and staging are served from the same origin, so an
// unscoped key would let one environment render the other's cached
// article list (the staging preview jumping to a production-only
// article). Staging builds (VITE_STAGING=1) use their own key; the
// production key is unchanged so existing visitors keep their cache.
//
// Staging never uses this cache at all, in either direction: it is a
// preview, and edits must show up on the next load instead of hiding
// behind the previous visit's list until a background refresh lands.
const CACHE_DISABLED = isStagingBuild();
const BASE_STORAGE_KEY = isStagingBuild()
  ? 'blog:list-cache:v1:staging'
  : 'blog:list-cache:v1';

// One persisted list per language, keyed the same way the staging
// key is separated: a suffix on the base key. The Japanese key is
// the original one, unchanged, so existing visitors keep their
// cache; translated lists live under ':en' / ':zh' and can never
// bleed into the Japanese list (or each other).
const storageKeyFor = (lang) =>
  (lang === 'en' || lang === 'zh' ? `${BASE_STORAGE_KEY}:${lang}` : BASE_STORAGE_KEY);

const isTitlesMap = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Keeps only the id -> array entries of a tags map, so a malformed
// payload cannot poison the persisted list. Tag strings themselves are
// normalized when the UI reads them (services/tags).
const sanitizeTagsMap = (value) => {
  if (!isTitlesMap(value)) {
    return {};
  }
  const map = {};
  Object.entries(value).forEach(([id, tags]) => {
    if (Array.isArray(tags)) {
      map[id] = tags;
    }
  });
  return map;
};

// Loads the last article list saved by saveCachedList for one
// language (Japanese when omitted). Returns null when nothing
// usable is stored (first visit, cleared storage, corrupt data).
export const loadCachedList = (lang) => {
  if (CACHE_DISABLED) {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKeyFor(lang));
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.ids) || data.ids.length === 0) {
      return null;
    }
    return {
      ids: data.ids,
      titles: isTitlesMap(data.titles) ? data.titles : {},
      // Lists saved before tags existed have no tags key at all; keep
      // it absent (rather than an empty map) so their shape is unchanged.
      ...(isTitlesMap(data.tags) ? { tags: sanitizeTagsMap(data.tags) } : {}),
      article_cache: Array.isArray(data.article_cache) ? data.article_cache : []
    };
  } catch {
    return null;
  }
};

// Persists the article list for the next visit, under the list's
// own language. Storage failures (quota, private mode) are
// ignored: the cache is an optimization, not a requirement.
export const saveCachedList = (data, lang) => {
  if (CACHE_DISABLED) {
    return;
  }
  try {
    localStorage.setItem(
      storageKeyFor(lang),
      JSON.stringify({
        ids: data.ids,
        titles: isTitlesMap(data.titles) ? data.titles : {},
        ...(isTitlesMap(data.tags) ? { tags: sanitizeTagsMap(data.tags) } : {}),
        article_cache: Array.isArray(data.article_cache) ? data.article_cache : []
      })
    );
  } catch {
    // Ignore storage errors.
  }
};
