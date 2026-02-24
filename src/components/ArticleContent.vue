<template>
  <article v-if="article" class="article-content">
    <h1>{{ article.title }}</h1>
    <div v-html="articleHtml"></div>
  </article>
</template>

<script setup>
defineProps({
  article: {
    type: Object,
    default: null
  },
  articleHtml: {
    type: String,
    default: ''
  }
});
</script>
