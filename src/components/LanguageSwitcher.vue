<template>
  <div class="lang-switch" role="group" :aria-label="t('language')">
    <button
      v-for="option in LANG_OPTIONS"
      :key="option.value"
      type="button"
      class="lang-switch-button"
      :class="{ active: option.value === currentLang }"
      :aria-pressed="option.value === currentLang"
      @click="setLang(option.value)"
    >{{ option.label }}</button>
  </div>
</template>

<script setup>
import { currentLang, setLang, t } from '../services/i18n';

// Each language is offered under its own name, the convention
// language switchers follow; the labels are deliberately not
// dictionary entries.
const LANG_OPTIONS = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
];
</script>
