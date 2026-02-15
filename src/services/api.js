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
