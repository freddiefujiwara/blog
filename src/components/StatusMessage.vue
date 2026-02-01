<template>
  <p v-if="message" class="status">
    {{ message }}
  </p>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: ''
  }
});
</script>
