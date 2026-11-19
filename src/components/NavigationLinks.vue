<template>
  <nav v-if="hasNavigation" class="navigation" :class="{ 'navigation-top': top }">
    <router-link
      v-if="prevLink"
      :to="prevLink"
      class="nav-link nav-prev"
      :aria-label="prevTitle ? t('prevArticleWithTitle', { title: prevTitle }) : t('prevArticle')"
    >
      <span class="nav-arrow" aria-hidden="true">←</span>
      <span class="nav-title">{{ formatNavTitle(prevTitle, t('prevArticle')) }}</span>
    </router-link>
    <router-link
      v-if="nextLink"
      :to="nextLink"
      class="nav-link nav-next"
      :aria-label="nextTitle ? t('nextArticleWithTitle', { title: nextTitle }) : t('nextArticle')"
    >
      <span class="nav-title">{{ formatNavTitle(nextTitle, t('nextArticle')) }}</span>
      <span class="nav-arrow" aria-hidden="true">→</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { t } from '../services/i18n';

const props = defineProps({
  prevLink: {
    type: String,
    default: ''
  },
  nextLink: {
    type: String,
    default: ''
  },
  prevTitle: {
    type: String,
    default: ''
  },
  nextTitle: {
    type: String,
    default: ''
  },
  top: {
    type: Boolean,
    default: false
  }
});

const hasNavigation = computed(() => Boolean(props.prevLink || props.nextLink));

// Article titles start with a "YYYY-MM-DD " date prefix. Dropping it in the
// one-line navigation leaves room for the meaningful part of the title;
// overflow is trimmed with an ellipsis by CSS.
const formatNavTitle = (title, fallback) => {
  if (!title) return fallback;
  return title.replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
};
</script>
