import { LIST_ENDPOINT, RSS_ENDPOINT } from '../constants';
import { isStagingBuild } from '../staging-banner';

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
    throw new Error('RSSの取得に失敗しました。');
  }
  return await response.text();
};

export const fetchArticle = async (id) => {
  const articleResponse = await apiFetch(`${LIST_ENDPOINT}?id=${id}`);
  if (!articleResponse.ok) {
    throw new Error('記事の取得に失敗しました。');
  }
  const data = await articleResponse.json();
  return data;
};

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
      if (item?.id && item?.title) {
        cached[item.id] = item.title;
      }
    });
  }
  return data.ids
    .map((id) => ({ id, title: titles[id] || cached[id] || '' }))
    .filter((entry) => entry.title);
};

// Lightweight list fetch for the hero link and title search: the API
// returns ids and titles only (no article bodies), which keeps the
// search responsive even when the article cache is cold.
export const fetchArticleTitles = async () => {
  const response = await apiFetch(`${LIST_ENDPOINT}?o=titles`);
  if (!response.ok) {
    throw new Error('記事タイトル一覧の取得に失敗しました。');
  }
  const data = await response.json();
  if (!data?.ids?.length) {
    throw new Error('最新記事が見つかりませんでした。');
  }
  return data;
};

export const fetchArticleList = async () => {
  const listResponse = await apiFetch(LIST_ENDPOINT);
  if (!listResponse.ok) {
    throw new Error('記事一覧の取得に失敗しました。');
  }
  const data = await listResponse.json();
  if (!data?.ids?.length) {
    throw new Error('最新記事が見つかりませんでした。');
  }
  return data;
};
