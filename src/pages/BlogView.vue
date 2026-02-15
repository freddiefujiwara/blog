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
import { ref, onMounted } from 'vue';
import { useBlog } from '../composables/useBlog';
import { useRSS } from '../composables/useRSS';
import NavigationLinks from '../components/NavigationLinks.vue';
import ArticleContent from '../components/ArticleContent.vue';
import StatusMessage from '../components/StatusMessage.vue';
import { RSS_ENDPOINT } from '../constants';

const { article, articleHtml, articleIds, errorMessage, prevLink, nextLink, prevTitle, nextTitle } = useBlog();
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
