<template>
  <div class="tag-page">
    <h1 class="tag-page-heading">タグ：{{ tag }}</h1>
    <p v-if="state === 'loading'" class="tag-page-status">読み込み中...</p>
    <p v-else-if="state === 'failed'" class="tag-page-status">読み込みに失敗しました。再読み込みしてください</p>
    <template v-else>
      <ul v-if="entries.length" class="tag-article-list">
        <li v-for="entry in entries" :key="entry.id" class="tag-article-item">
          <router-link :to="`/${entry.id}`">{{ entry.title }}</router-link>
        </li>
      </ul>
      <p v-else class="tag-page-status">このタグの記事はまだありません</p>
    </template>
    <div class="footer-link">
      <router-link to="/">最新記事（トップ）へ戻る</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { buildSearchableArticles, fetchArticleTitles } from '../services/api';
import { loadCachedList } from '../services/listCache';
import { extractTagsMap, filterArticlesByTag, mergeTagsMaps } from '../services/tags';

// Lists every article carrying one tag, newest first. The data is the
// same titles payload the search uses (ids, titles, tags), primed from
// the persisted list when there is one; no extra endpoint is needed.
const props = defineProps({
  tag: {
    type: String,
    default: ''
  }
});

const articles = ref([]);
const tagsMap = ref({});
const state = ref('loading');

const entries = computed(() =>
  filterArticlesByTag(articles.value, tagsMap.value, props.tag)
);

const applyData = (data) => {
  articles.value = buildSearchableArticles(data);
  tagsMap.value = mergeTagsMaps(tagsMap.value, extractTagsMap(data));
};

const load = async () => {
  const cached = loadCachedList();
  if (cached?.ids?.length) {
    applyData(cached);
    state.value = 'ready';
  }
  try {
    const data = await fetchArticleTitles();
    applyData(data);
    state.value = 'ready';
  } catch {
    if (!articles.value.length) {
      state.value = 'failed';
    }
  }
};

onMounted(() => {
  document.title = `タグ：${props.tag}`;
  load();
});

watch(
  () => props.tag,
  () => {
    document.title = `タグ：${props.tag}`;
    load();
  }
);
</script>
