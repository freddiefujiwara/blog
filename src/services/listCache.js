import { isStagingBuild } from '../staging-banner';

// Production and staging are served from the same origin, so an
// unscoped key would let one environment render the other's cached
// article list (the staging preview jumping to a production-only
// article). Staging builds (VITE_STAGING=1) use their own key; the
// production key is unchanged so existing visitors keep their cache.
const STORAGE_KEY = isStagingBuild()
  ? 'blog:list-cache:v1:staging'
  : 'blog:list-cache:v1';

// Loads the last article list saved by saveCachedList. Returns null when
// nothing usable is stored (first visit, cleared storage, corrupt data).
export const loadCachedList = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.ids) || data.ids.length === 0) {
      return null;
    }
    return {
      ids: data.ids,
      article_cache: Array.isArray(data.article_cache) ? data.article_cache : []
    };
  } catch {
    return null;
  }
};

// Persists the article list for the next visit. Storage failures (quota,
// private mode) are ignored: the cache is an optimization, not a requirement.
export const saveCachedList = (data) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ids: data.ids,
        article_cache: Array.isArray(data.article_cache) ? data.article_cache : []
      })
    );
  } catch {
    // Ignore storage errors.
  }
};
