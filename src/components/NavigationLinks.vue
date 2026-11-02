<template>
  <nav v-if="hasNavigation" class="navigation" :class="{ 'navigation-top': top }">
    <router-link v-if="prevLink" :to="prevLink" class="nav-link nav-prev">
      <span class="nav-arrow" aria-hidden="true">←</span>
      <span class="nav-text">
        <span class="nav-label">前の記事</span>
        <span v-if="prevTitle" class="nav-title">{{ prevTitle }}</span>
      </span>
    </router-link>
    <router-link v-if="nextLink" :to="nextLink" class="nav-link nav-next">
      <span class="nav-text">
        <span class="nav-label">次の記事</span>
        <span v-if="nextTitle" class="nav-title">{{ nextTitle }}</span>
      </span>
      <span class="nav-arrow" aria-hidden="true">→</span>
    </router-link>
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
</script>
