<template>
  <article v-if="article" class="article-content" @error.capture="handleImageError">
    <h1>{{ article.title }}</h1>
    <template v-if="markerParts">
      <div v-html="markerParts.before"></div>
      <TableOfContents :entries="toc" />
      <div v-html="markerParts.after"></div>
    </template>
    <template v-else>
      <TableOfContents :entries="toc" />
      <div v-html="articleHtml"></div>
    </template>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import TableOfContents from './TableOfContents.vue';
import { splitHtmlAtTocMarker } from '../services/markdown.js';
import { LINK_CARD_FALLBACK_IMAGE } from '../constants.js';

const props = defineProps({
  article: {
    type: Object,
    default: null
  },
  articleHtml: {
    type: String,
    default: ''
  },
  toc: {
    type: Array,
    default: () => []
  }
});

// When the document carries a [[目次]] marker paragraph, the TOC is
// rendered at that spot instead of right under the title, so the
// opening lines stay untouched. The marker itself is removed.
const markerParts = computed(() => splitHtmlAtTocMarker(props.articleHtml));

// Link-card images come from arbitrary shop sites and sometimes fail
// to load; swap in the placeholder once, like the possessions list
// does, instead of leaving a broken image behind.
const handleImageError = (event) => {
  const target = event.target;
  if (!target || target.tagName !== 'IMG') return;
  if (!target.classList.contains('link-card-image')) return;
  if (target.dataset.errored) return;
  target.dataset.errored = 'true';
  target.src = LINK_CARD_FALLBACK_IMAGE;
};
</script>
