import { LIST_ENDPOINT, RSS_ENDPOINT } from '../constants';
import { isStagingBuild } from '../staging-banner';
import { t } from './i18n';

// The GAS web app sometimes drops a request before the code runs
// (instant failures) or leaves it hanging (observed at 60s+ on
// 2026-11-12), so every API call gets a hard timeout and retries:
// a stalled attempt is aborted and re-issued instead of leaving
// the page on a spinner forever. 20s is generous for a warm read
// (normally 1–4s); a cold conversion that outlasts it usually
// completes on the server anyway, and the retry then reads the
// stored result.
export const API_TIMEOUT_MS = 20000;
export const API_MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [600, 1500];

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const fetchOnce = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const options = { signal: controller.signal };
    // Staging previews bypass the browser's HTTP cache for API
    // responses, so a reload always shows the current data.
    // Production keeps the default caching behavior.
    if (isStagingBuild()) options.cache = 'no-store';
    return await fetch(url, options);
  } finally {
    clearTimeout(timer);
  }
};

// Read-only GET with retries. Network errors, timeouts and 5xx
// responses are retried; anything else is returned as-is because
// retrying it cannot help. The final attempt's outcome is what
// the caller sees (a response to check, or the error thrown).
export const apiFetch = async (url) => {
  let lastError = null;
  for (let attempt = 0; attempt < API_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchOnce(url);
      // Real Responses always carry a numeric status; the ok
      // fallback only matters for hand-rolled response doubles.
      const retryable = typeof response?.status === 'number' ? response.status >= 500 : !response?.ok;
      if (!retryable || attempt === API_MAX_ATTEMPTS - 1) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === API_MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
    await sleep(RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
  }
  throw lastError;
};

export const fetchRSS = async () => {
  const response = await apiFetch(RSS_ENDPOINT);
  if (!response.ok) {
    throw new Error(t('rssFetchFailed'));
  }
  return await response.text();
};

// Fetches a JSON response, turning a non-OK status into an error
// with the caller's message.
const fetchJson = async (url, failureMessage) => {
  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(failureMessage);
  }
  return response.json();
};

// The translated variants of the API take a lang parameter
// (en|zh). Japanese is the API's native shape and is requested
// exactly as before — no parameter at all.
const langQuery = (lang) => (lang === 'en' || lang === 'zh' ? `&lang=${lang}` : '');

export const fetchArticle = async (id, lang) =>
  fetchJson(`${LIST_ENDPOINT}?id=${id}${langQuery(lang)}`, t('articleFetchFailed'));

// Maps a list response to the {id, title} entries the title search
// offers, newest first. Titles come from the response's titles map;
// pre-cached articles fill any gaps (older responses have no map).
export const buildSearchableArticles = (data) => {
  if (!data || !Array.isArray(data.ids)) {
    return [];
  }
  const titles = data.titles && typeof data.titles === 'object' && !Array.isArray(data.titles)
    ? data.titles
    : {};
  const cached = {};
  if (Array.isArray(data.article_cache)) {
    data.article_cache.forEach((item) => {
      if (item?.id && typeof item?.title === 'string' && item.title) {
        cached[item.id] = item.title;
      }
    });
  }
  // A title of the wrong type (a number, an object) counts as no
  // title: the search renders titles as text and calls string
  // methods on them, so a non-string must never leak through.
  return data.ids
    .map((id) => {
      const mapped = titles[id];
      return { id, title: (typeof mapped === 'string' ? mapped : '') || cached[id] || '' };
    })
    .filter((entry) => entry.title);
};

// Lightweight list fetch for the hero link and title search: the API
// returns ids and titles only (no article bodies), which keeps the
// search responsive even when the article cache is cold.
export const fetchArticleTitles = async (lang) => {
  const data = await fetchJson(`${LIST_ENDPOINT}?o=titles${langQuery(lang)}`, t('articleTitlesFetchFailed'));
  if (!Array.isArray(data?.ids) || !data.ids.length) {
    throw new Error(t('latestNotFound'));
  }
  return data;
};

// The full list (with pre-cached article bodies) exists only in
// Japanese; translated pages use the titles endpoint as their list
// source instead (see useBlog).
export const fetchArticleList = async () => {
  const data = await fetchJson(LIST_ENDPOINT, t('articleListFetchFailed'));
  if (!Array.isArray(data?.ids) || !data.ids.length) {
    throw new Error(t('latestNotFound'));
  }
  return data;
};
