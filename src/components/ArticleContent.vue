<template>
  <article v-if="article" ref="rootEl" class="article-content" @error.capture="handleImageError">
    <h1>{{ article.title }}</h1>
    <TagChips :tags="articleTags" />
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TableOfContents from './TableOfContents.vue';
import TagChips from './TagChips.vue';
import { splitHtmlAtTocMarkers } from '../services/markdown.js';
import { extractArticleTags } from '../services/tags.js';
import { destroyMusicPlayer, mountMusicPlayer } from '../services/musicPlayer.js';
import { createScrollDepthTracker } from '../services/scrollDepth.js';
import { trackArticleScroll } from '../analytics.js';
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

// Tag chips under the title. Empty for articles without tags and for
// article payloads from before the API carried them.
const articleTags = computed(() => extractArticleTags(props.article));

// Link-card images come from arbitrary shop sites and sometimes fail
// to load; swap in the placeholder once, like the possessions list
// does, instead of leaving a broken image behind.
const rootEl = ref(null);

const swapToFallback = (img) => {
  if (img.dataset.errored) return;
  img.dataset.errored = 'true';
  img.src = LINK_CARD_FALLBACK_IMAGE;
};

const handleImageError = (event) => {
  const target = event.target;
  if (!target || target.tagName !== 'IMG') return;
  if (!target.classList.contains('link-card-image')) return;
  swapToFallback(target);
};

// An image that fails before the error listener is ready (or whose
// failure the browser had already cached) never fires an error event
// the handler can catch; it just sits there complete with zero width.
// Sweep for those after every render so they get the placeholder too.
const sweepBrokenCardImages = () => {
  if (!rootEl.value) return;
  rootEl.value
    .querySelectorAll('img.link-card-image')
    .forEach((img) => {
      if (img.complete && img.naturalWidth === 0) swapToFallback(img);
    });
};

// Shared links can carry a fragment for a heading (h-…) or an item
// title (item-…). The article renders asynchronously, so the
// browser's own fragment jump fires before the target exists;
// scroll to it after render instead, once per article and fragment,
// so later re-renders do not yank the reader back to the target.
const lastFragmentKey = ref('');

const scrollToFragment = () => {
  if (!rootEl.value) return;
  const fragment = window.location.hash.replace(/^#/, '');
  if (!fragment) return;
  const key = `${props.article?.title ?? ''}|${fragment}`;
  if (lastFragmentKey.value === key) return;
  const target = document.getElementById(fragment);
  if (!target || !rootEl.value.contains(target)) return;
  lastFragmentKey.value = key;
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView();
  }
};

// Reading depth is measured per article view: a fresh tracker
// starts after each article render (so its reported thresholds
// reset when the article changes) and reports the 25/50/75/100%
// marks as article_scroll events.
let scrollTracker = null;

const restartScrollTracking = () => {
  scrollTracker?.stop();
  scrollTracker = createScrollDepthTracker(trackArticleScroll);
  scrollTracker.start();
};

// Articles that carry [[音楽|...]] markers get their track
// placeholders replaced by one playlist player after each render;
// leaving the article destroys the player so playback stops.
const refreshAfterRender = () => {
  sweepBrokenCardImages();
  mountMusicPlayer(rootEl.value);
  scrollToFragment();
  restartScrollTracking();
};

onMounted(refreshAfterRender);
watch(
  () => props.articleHtml,
  () => nextTick(refreshAfterRender)
);
onBeforeUnmount(() => {
  destroyMusicPlayer();
  scrollTracker?.stop();
  scrollTracker = null;
});
</script>
