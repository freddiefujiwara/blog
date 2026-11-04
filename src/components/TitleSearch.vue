<template>
  <div class="title-search">
    <input
      v-model="query"
      type="search"
      class="title-search-input"
      placeholder="記事タイトルで探す"
      aria-label="記事タイトルで探す"
    >
    <ul v-if="query.trim()" class="title-search-results">
      <li v-if="state === 'loading'" class="title-search-status">
        <span class="title-search-spinner" aria-hidden="true"></span>検索中…
      </li>
      <li v-else-if="state === 'failed'" class="title-search-status">読み込みに失敗しました。再読み込みしてください</li>
      <template v-else>
        <li v-for="entry in matches" :key="entry.id" class="title-search-item">
          <router-link :to="`/${entry.id}`" @click="query = ''">{{ entry.title }}</router-link>
        </li>
        <li v-if="matches.length === 0" class="title-search-empty">該当する記事がありません</li>
      </template>
    </ul>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

// Title search, simple version: substring match over the article
// titles only (no full-text search). Results keep the list order,
// which is newest first, and are capped so the box stays compact.
const MAX_RESULTS = 10;

const props = defineProps({
  articles: {
    type: Array,
    default: () => []
  },
  // 'loading' while the title list is on its way from the API (which
  // can take a while), 'failed' when it never arrived, else 'ready'.
  // Without this, typing early looks exactly like "no such article".
  state: {
    type: String,
    default: 'ready'
  }
});

const query = ref('');

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return props.articles
    .filter((entry) => entry.title.toLowerCase().includes(needle))
    .slice(0, MAX_RESULTS);
});
</script>
