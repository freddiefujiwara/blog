<template>
  <article v-if="article" class="article-content">
    <h1>{{ article.title }}</h1>
    <TableOfContents :entries="toc" />
    <div v-html="articleHtml"></div>
  </article>
</template>

<script setup>
import TableOfContents from './TableOfContents.vue';

defineProps({
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
</script>
