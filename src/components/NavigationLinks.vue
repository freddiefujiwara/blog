<template>
  <nav v-if="hasNavigation" class="navigation" :class="{ 'navigation-top': top }">
    <a v-if="prevLink" :href="prevLink">前の記事</a>
    <a v-if="nextLink" :href="nextLink">次の記事</a>
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
  top: {
    type: Boolean,
    default: false
  }
});

const hasNavigation = computed(() => Boolean(props.prevLink || props.nextLink));
</script>
