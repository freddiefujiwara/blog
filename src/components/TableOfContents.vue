<template>
  <nav v-if="entries.length >= MIN_ENTRIES" class="table-of-contents" aria-label="目次">
    <p class="toc-heading">目次</p>
    <ul class="toc-list">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="toc-item"
        :class="{ 'toc-item-sub': entry.level === 3 }"
      >
        <a :href="`#${entry.id}`">{{ entry.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<script setup>
// A table of contents only earns its place on longer articles;
// below this many sections it stays hidden.
const MIN_ENTRIES = 3;

defineProps({
  entries: {
    type: Array,
    default: () => []
  }
});
</script>
