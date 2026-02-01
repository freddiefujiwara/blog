<template>
  <main>
    <h1 v-if="article">{{ article.title }}</h1>
    <p v-else class="status">読み込み中...</p>
    <article v-if="article" v-html="articleHtml"></article>
    <p v-if="errorMessage" class="status">{{ errorMessage }}</p>
  </main>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { marked } from 'marked';

const listEndpoint =
  'https://script.google.com/macros/s/AKfycbydcnw4yt5K8lz8Wf0PCbG6Q9yD3jf1W2lsGucOor2KII7duJr7qevcMiwNHJTe8GZH/exec';

const article = ref(null);
const errorMessage = ref('');

const articleHtml = computed(() => {
  if (!article.value) {
    return '';
  }
  return marked.parse(article.value.markdown ?? '');
});

const fetchLatestArticle = async () => {
  const listResponse = await fetch(listEndpoint);
  if (!listResponse.ok) {
    throw new Error('記事一覧の取得に失敗しました。');
  }
  const ids = await listResponse.json();
  const latestId = ids[0];
  if (!latestId) {
    throw new Error('最新記事が見つかりませんでした。');
  }

  const articleResponse = await fetch(`${listEndpoint}?id=${latestId}`);
  if (!articleResponse.ok) {
    throw new Error('記事の取得に失敗しました。');
  }
  const data = await articleResponse.json();
  article.value = data;
  if (data?.title) {
    document.title = data.title;
  }
};

onMounted(async () => {
  try {
    await fetchLatestArticle();
  } catch (error) {
    errorMessage.value = error?.message ?? '読み込みに失敗しました。';
  }
});
</script>
