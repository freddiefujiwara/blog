<template>
  <div>
    <StatusMessage v-if="!article && !errorMessage" message="読み込み中..." />
    <NavigationLinks
      v-if="article"
      :prev-link="prevLink"
      :next-link="nextLink"
      :prev-title="prevTitle"
      :next-title="nextTitle"
      :top="true"
    />
    <ArticleContent :article="article" :article-html="articleHtml" />
    <StatusMessage :message="errorMessage" />
    <NavigationLinks
      v-if="article"
      :prev-link="prevLink"
      :next-link="nextLink"
      :prev-title="prevTitle"
      :next-title="nextTitle"
    />
    <div v-if="article" class="footer-link">
      <router-link to="/">トップページへ戻る</router-link>
    </div>
  </div>
</template>

<script setup>
import { useBlog } from '../composables/useBlog';
import NavigationLinks from '../components/NavigationLinks.vue';
import ArticleContent from '../components/ArticleContent.vue';
import StatusMessage from '../components/StatusMessage.vue';

const { article, articleHtml, errorMessage, prevLink, nextLink, prevTitle, nextTitle } = useBlog();
</script>
