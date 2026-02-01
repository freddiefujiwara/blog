<template>
  <div v-if="article">
    <h1>{{ article.title }}</h1>
    <article v-html="articleHtml"></article>
  </div>
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
