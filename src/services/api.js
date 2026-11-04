import { LIST_ENDPOINT, RSS_ENDPOINT } from '../constants';

export const fetchRSS = async () => {
  const response = await fetch(RSS_ENDPOINT);
  if (!response.ok) {
    throw new Error('RSSの取得に失敗しました。');
  }
  return await response.text();
};

export const fetchArticle = async (id) => {
  const articleResponse = await fetch(`${LIST_ENDPOINT}?id=${id}`);
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
  const response = await fetch(`${LIST_ENDPOINT}?o=titles`);
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
  const listResponse = await fetch(LIST_ENDPOINT);
  if (!listResponse.ok) {
    throw new Error('記事一覧の取得に失敗しました。');
  }
  const data = await listResponse.json();
  if (!data?.ids?.length) {
    throw new Error('最新記事が見つかりませんでした。');
  }
  return data;
};
