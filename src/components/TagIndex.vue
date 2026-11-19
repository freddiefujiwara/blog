<template>
  <nav v-if="tags.length" class="tag-index" :aria-label="t('tagsHeading')">
    <h2 class="tag-index-heading">{{ t('tagsHeading') }}</h2>
    <ul class="tag-chips">
      <li v-for="entry in tags" :key="entry.tag" class="tag-chip-item">
        <router-link class="tag-chip" :to="tagPath(entry.tag, routeLang)">{{ tagLabel(entry.tag) }}<span class="tag-chip-count">{{ entry.count }}</span></router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { tagPath } from '../services/tags';
import { routeLang, t, tagLabel } from '../services/i18n';

// Index of every tag in the current article list, with article counts,
// linking to the tag pages. Renders nothing when no article carries a
// tag yet (e.g. payloads from before tags existed).
defineProps({
  tags: {
    type: Array,
    default: () => []
  }
});
</script>
