<template>
  <div class="lang-switch" role="group" :aria-label="t('language')">
    <button
      v-for="option in LANG_OPTIONS"
      :key="option.value"
      type="button"
      class="lang-switch-button"
      :class="{ active: option.value === currentLang }"
      :aria-pressed="option.value === currentLang"
      @click="choose(option.value)"
    >{{ option.label }}</button>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { currentLang, localizedPath, setLang, t } from '../services/i18n';

// Each language is offered under its own name, the convention
// language switchers follow; the labels are deliberately not
// dictionary entries.
const LANG_OPTIONS = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' }
];

const route = useRoute();
const router = useRouter();

// The switcher moves between the languages OF THE CURRENT PAGE:
// the same article, tag page or root under the chosen language's
// URL (Japanese without a prefix, English and Chinese under
// /en and /zh). The choice is also saved as the UI preference, so
// Japanese pages visited afterwards open in that UI language.
const choose = (lang) => {
  setLang(lang);
  const target = localizedPath(route.path, lang);
  if (target !== route.path) {
    router.push(target);
  }
};
</script>
