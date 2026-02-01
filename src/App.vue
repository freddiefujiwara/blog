<template>
  <main>
    <h1 v-if="article">{{ article.title }}</h1>
    <p v-else class="status">読み込み中...</p>
    <article v-if="article" v-html="articleHtml"></article>
    <p v-if="errorMessage" class="status">{{ errorMessage }}</p>
    <nav v-if="hasNavigation" class="navigation">
      <a v-if="prevLink" :href="prevLink">前の記事</a>
      <a v-if="nextLink" :href="nextLink">次の記事</a>
    </nav>
    <div v-if="article" class="footer-link">
      <a href="https://freddiefujiwara.com/blog/">トップページへ戻る</a>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { marked } from 'marked';
import { resolveArticleId, buildNavigationLinks } from './articleNavigation';

const listEndpoint =
  'https://script.google.com/macros/s/AKfycbydcnw4yt5K8lz8Wf0PCbG6Q9yD3jf1W2lsGucOor2KII7duJr7qevcMiwNHJTe8GZH/exec';

const article = ref(null);
const articleIds = ref([]);
const errorMessage = ref('');
const currentId = ref('');

const articleHtml = computed(() => {
  if (!article.value) {
    return '';
  }
  return marked.parse(article.value.markdown ?? '');
});

const navigationLinks = computed(() =>
  buildNavigationLinks(articleIds.value, currentId.value, listEndpoint)
);

const prevLink = computed(() => navigationLinks.value.prevLink);
const nextLink = computed(() => navigationLinks.value.nextLink);
const hasNavigation = computed(() => Boolean(prevLink.value || nextLink.value));

const fetchArticle = async (id) => {
  const articleResponse = await fetch(`${listEndpoint}?id=${id}`);
  if (!articleResponse.ok) {
    throw new Error('記事の取得に失敗しました。');
  }
  const data = await articleResponse.json();
  article.value = data;
  currentId.value = id;
  if (data?.title) {
    document.title = data.title;
  }
};

const fetchArticleList = async () => {
  const listResponse = await fetch(listEndpoint);
  if (!listResponse.ok) {
    throw new Error('記事一覧の取得に失敗しました。');
  }
  const ids = await listResponse.json();
  if (!ids?.length) {
    throw new Error('最新記事が見つかりませんでした。');
  }
  articleIds.value = ids;
  return ids;
};

onMounted(async () => {
  try {
    const ids = await fetchArticleList();
    const articleId = resolveArticleId(ids, window.location.search);
    if (!articleId) {
      throw new Error('最新記事が見つかりませんでした。');
    }
    await fetchArticle(articleId);
  } catch (error) {
    errorMessage.value = error?.message ?? '読み込みに失敗しました。';
  }
});
</script>
