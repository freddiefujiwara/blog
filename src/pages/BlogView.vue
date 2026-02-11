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
    <div v-if="article && articleIds.length > 0" class="footer-link">
      <router-link :to="'/' + articleIds[0]">最新記事（トップ）へ戻る</router-link>
      &nbsp;|&nbsp;
      <a :href="RSS_ENDPOINT" target="_blank" rel="noopener noreferrer">RSS</a>
    </div>
  </div>
</template>

<script setup>
import { useBlog } from '../composables/useBlog';
import NavigationLinks from '../components/NavigationLinks.vue';
import ArticleContent from '../components/ArticleContent.vue';
import StatusMessage from '../components/StatusMessage.vue';
import { RSS_ENDPOINT } from '../constants';

const { article, articleHtml, articleIds, errorMessage, prevLink, nextLink, prevTitle, nextTitle } = useBlog();
</script>
