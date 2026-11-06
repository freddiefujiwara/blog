<template>
  <article v-if="article" class="article-content" @error.capture="handleImageError">
    <h1>{{ article.title }}</h1>
    <template v-if="markerSegments">
      <template v-for="(part, index) in markerSegments" :key="index">
        <div v-if="part" v-html="part"></div>
        <TableOfContents v-if="index < markerSegments.length - 1" :entries="toc" />
      </template>
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
import { splitHtmlAtTocMarkers } from '../services/markdown.js';
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

// When the document carries [[目次]] marker paragraphs, the TOC is
// rendered at those spots instead of right under the title, so the
// opening lines stay untouched. Several markers may be used; the
// whole-article TOC appears at each of them. Markers are removed.
const markerSegments = computed(() => splitHtmlAtTocMarkers(props.articleHtml));

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
