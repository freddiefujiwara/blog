<template>
  <nav v-if="hasNavigation" class="navigation" :class="{ 'navigation-top': top }">
    <a v-if="prevLink" :href="prevLink">{{ formatPrevTitle(prevTitle) }}</a>
    <a v-if="nextLink" :href="nextLink">{{ formatNextTitle(nextTitle) }}</a>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

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

const formatPrevTitle = (title) => {
  if (!title) return '前の記事';
  const truncated = title.length > 16 ? title.slice(0, 16) + '…' : title;
  return '<<' + truncated;
};

const formatNextTitle = (title) => {
  if (!title) return '次の記事';
  const truncated = title.length > 16 ? title.slice(0, 16) + '…' : title;
  return truncated + '>>';
};
</script>
