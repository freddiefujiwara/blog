import { LIST_ENDPOINT } from '../constants';

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
  const ids = await listResponse.json();
  if (!ids?.length) {
    throw new Error('最新記事が見つかりませんでした。');
  }
  return ids;
};
