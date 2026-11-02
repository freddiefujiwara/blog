const STORAGE_KEY = 'blog:list-cache:v1';

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
