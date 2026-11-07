<template>
  <ul v-if="tags.length" class="tag-chips">
    <li v-for="tag in tags" :key="tag" class="tag-chip-item">
      <router-link class="tag-chip" :to="tagPath(tag)">{{ tag }}</router-link>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue';
import { normalizeTagList, tagPath } from '../services/tags';

// Chips linking to each tag's page. Renders nothing when the article
// carries no tags (including payloads from before tags existed).
const props = defineProps({
  tags: {
    type: Array,
    default: () => []
  }
});

const tags = computed(() => normalizeTagList(props.tags));
</script>
