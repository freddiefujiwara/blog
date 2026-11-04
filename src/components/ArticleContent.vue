<template>
  <article v-if="article" class="article-content">
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
</script>
