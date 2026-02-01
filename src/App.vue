<template>
  <main>
    <p class="site-title">ミニマリストのブログ</p>
    <StatusMessage v-if="!article && !errorMessage" message="読み込み中..." />
    <NavigationLinks v-if="article" :prev-link="prevLink" :next-link="nextLink" :top="true" />
    <ArticleContent :article="article" :article-html="articleHtml" />
    <StatusMessage :message="errorMessage" />
    <NavigationLinks v-if="article" :prev-link="prevLink" :next-link="nextLink" />
    <div v-if="article" class="footer-link">
      <a href="https://freddiefujiwara.com/blog/">トップページへ戻る</a>
    </div>
  </main>
</template>

<script setup>
import { useBlog } from './composables/useBlog';
import NavigationLinks from './components/NavigationLinks.vue';
import ArticleContent from './components/ArticleContent.vue';
import StatusMessage from './components/StatusMessage.vue';

const { article, articleHtml, errorMessage, prevLink, nextLink } = useBlog();
</script>
