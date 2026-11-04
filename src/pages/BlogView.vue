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
    <TitleSearch v-if="article" :articles="searchableArticles" />
    <ArticleContent :article="article" :article-html="articleHtml" :toc="toc" />
    <ShareLinks v-if="article" :title="article.title" :url="articleUrl" />
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
      &nbsp;|&nbsp;
      <a
        href="#"
        class="copy-link"
        :class="{ disabled: !rssXml }"
        @click.prevent="copyRSS"
      >{{ copyText }}</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBlog } from '../composables/useBlog';
import { useRSS } from '../composables/useRSS';
import NavigationLinks from '../components/NavigationLinks.vue';
import ArticleContent from '../components/ArticleContent.vue';
import TitleSearch from '../components/TitleSearch.vue';
import ShareLinks from '../components/ShareLinks.vue';
import StatusMessage from '../components/StatusMessage.vue';
import { RSS_ENDPOINT } from '../constants';
import { extractTocFromHtml } from '../services/markdown';
import { buildArticleUrl } from '../share';

const { article, articleHtml, articleIds, searchableArticles, currentId, errorMessage, prevLink, nextLink, prevTitle, nextTitle } = useBlog();

const toc = computed(() => extractTocFromHtml(articleHtml.value));

const articleUrl = computed(() => (currentId.value ? buildArticleUrl(currentId.value) : ''));
const { rssXml, fetchRSS } = useRSS();

const copyText = ref('コピー');

const copyRSS = async () => {
  if (!rssXml.value) return;
  try {
    await navigator.clipboard.writeText(rssXml.value);
    copyText.value = 'コピー完了';
    setTimeout(() => {
      copyText.value = 'コピー';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

onMounted(() => {
  fetchRSS();
});
</script>
