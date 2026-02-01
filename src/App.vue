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
  </main>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { marked } from 'marked';

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

const currentIndex = computed(() => {
  if (!currentId.value) {
    return -1;
  }
  return articleIds.value.indexOf(currentId.value);
});

const prevLink = computed(() => {
  if (currentIndex.value > 0) {
    const prevId = articleIds.value[currentIndex.value - 1];
    return `${listEndpoint}?id=${prevId}`;
  }
  return '';
});

const nextLink = computed(() => {
  if (
    currentIndex.value !== -1 &&
    currentIndex.value < articleIds.value.length - 1
  ) {
    const nextId = articleIds.value[currentIndex.value + 1];
    return `${listEndpoint}?id=${nextId}`;
  }
  return '';
});

const hasNavigation = computed(() => Boolean(prevLink.value || nextLink.value));

const resolveArticleId = (ids) => {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  if (requestedId && ids.includes(requestedId)) {
    return requestedId;
  }
  return ids[0];
};

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
    const articleId = resolveArticleId(ids);
    if (!articleId) {
      throw new Error('最新記事が見つかりませんでした。');
    }
    await fetchArticle(articleId);
  } catch (error) {
    errorMessage.value = error?.message ?? '読み込みに失敗しました。';
  }
});
</script>
