<template>
  <div class="tag-page">
    <h1 class="tag-page-heading">{{ t('tagPageTitle', { tag }) }}</h1>
    <p v-if="state === 'loading'" class="tag-page-status">{{ t('loading') }}</p>
    <p v-else-if="state === 'failed'" class="tag-page-status">{{ t('loadFailedReload') }}</p>
    <template v-else>
      <ul v-if="entries.length" class="tag-article-list">
        <li v-for="entry in entries" :key="entry.id" class="tag-article-item">
          <router-link :to="`/${entry.id}`">{{ entry.title }}</router-link>
        </li>
      </ul>
      <p v-else class="tag-page-status">{{ t('tagEmpty') }}</p>
    </template>
    <div class="footer-link">
      <router-link to="/">{{ t('backToLatest') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { buildSearchableArticles, fetchArticleTitles } from '../services/api';
import { loadCachedList } from '../services/listCache';
import { extractTagsMap, filterArticlesByTag, mergeTagsMaps } from '../services/tags';
import { currentLang, t } from '../services/i18n';

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

const applyTitle = () => {
  document.title = t('tagPageTitle', { tag: props.tag });
};

onMounted(() => {
  applyTitle();
  load();
});

watch(
  () => props.tag,
  () => {
    applyTitle();
    load();
  }
);

// The tag page owns its document.title, so it also follows a UI
// language switch while the reader stays on the page.
watch(currentLang, applyTitle);
</script>
