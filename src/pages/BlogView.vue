<template>
  <div>
    <StatusMessage v-if="!article && !errorMessage" :message="t('loading')" />
    <NavigationLinks
      v-if="article"
      :prev-link="prevLink"
      :next-link="nextLink"
      :prev-title="prevTitle"
      :next-title="nextTitle"
      :top="true"
    />
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
      <router-link :to="'/' + articleIds[0]">{{ t('backToLatest') }}</router-link>
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
import ShareLinks from '../components/ShareLinks.vue';
import StatusMessage from '../components/StatusMessage.vue';
import { RSS_ENDPOINT } from '../constants';
import { extractTocFromHtml } from '../services/markdown';
import { buildArticleUrl } from '../share';
import { t } from '../services/i18n';

const { article, articleHtml, articleIds, currentId, errorMessage, prevLink, nextLink, prevTitle, nextTitle } = useBlog();

const toc = computed(() => extractTocFromHtml(articleHtml.value));

const articleUrl = computed(() => (currentId.value ? buildArticleUrl(currentId.value) : ''));
const { rssXml, fetchRSS } = useRSS();

// Derived from the copied flag so the label also follows a UI
// language switch while the confirmation is showing.
const copied = ref(false);
const copyText = computed(() => (copied.value ? t('copyDone') : t('copy')));

const copyRSS = async () => {
  if (!rssXml.value) return;
  try {
    await navigator.clipboard.writeText(rssXml.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

onMounted(() => {
  fetchRSS();
});
</script>
