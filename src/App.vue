<template>
  <div>
    <nav class="site-nav">
      <a class="brand" href="https://freddiefujiwara.com/">藤原史和｜川口を歩くQAエンジニア</a>
      <ul>
        <li><a href="https://freddiefujiwara.com/" @click="trackNavClick('top')">トップ</a></li>
        <li><a href="https://freddiefujiwara.com/#about" @click="trackNavClick('about')">プロフィール</a></li>
        <li><a href="https://freddiefujiwara.com/#activity" @click="trackNavClick('activity')">活動・発信</a></li>
        <li><a href="https://freddiefujiwara.com/#contact" @click="trackNavClick('contact')">情報交換</a></li>
        <li><a href="/blog/" class="active" aria-current="page" @click="trackNavClick('blog')">ブログ</a></li>
        <li><a href="https://freddiefujiwara.com/list-of-stuff/" @click="trackNavClick('list')">持ち物</a></li>
      </ul>
      <div class="nav-search">
        <TitleSearch :articles="searchableArticles" :state="searchState" />
      </div>
    </nav>
    <header class="header hero">
      <router-link
        v-if="latestArticlePath"
        :to="latestArticlePath"
        class="hero-inner hero-link"
      >
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1><span class="h1-name">藤原史和</span><span class="h1-sep" aria-hidden="true">｜</span><span class="h1-role">川口を歩くQAエンジニア</span></h1>
      </router-link>
      <div v-else class="hero-inner">
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1><span class="h1-name">藤原史和</span><span class="h1-sep" aria-hidden="true">｜</span><span class="h1-role">川口を歩くQAエンジニア</span></h1>
      </div>
      <div class="hero-search">
        <TitleSearch :articles="searchableArticles" :state="searchState" />
      </div>
    </header>
    <div class="layout">
      <TagIndex :tags="tagIndex" />
      <router-view />
      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/blog/" target="_blank" rel="noopener">ブログ <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/list-of-stuff/" target="_blank" rel="noopener">持ち物 <span class="arr">↗</span></a>
          <a href="https://freddiefujiwara.com/bucket-list/" target="_blank" rel="noopener">バケットリスト <span class="arr">↗</span></a>
          <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
          <a href="https://www.facebook.com/freddiefujiwara" target="_blank" rel="noopener">Facebook <span class="arr">↗</span></a>
          <a href="https://www.google.com/maps/contrib/105456242747265663411/reviews" target="_blank" rel="noopener">Googleマップの口コミ <span class="arr">↗</span></a>
          <a href="https://review.travel.rakuten.co.jp/reviewer/fumikazufujiwara" target="_blank" rel="noopener">楽天トラベルの口コミ <span class="arr">↗</span></a>
          <a href="https://tabelog.com/rvwr/zegenvs/" target="_blank" rel="noopener">食べログの口コミ <span class="arr">↗</span></a>
          <a href="https://retty.me/user/50281/" target="_blank" rel="noopener">Rettyの口コミ <span class="arr">↗</span></a>
          <a href="https://x.com/freddiefujiwara" target="_blank" rel="noopener">X <span class="arr">↗</span></a>
          <a href="https://github.com/freddiefujiwara" target="_blank" rel="noopener">GitHub <span class="arr">↗</span></a>
          <a href="https://linkedin.com/in/freddiefujiwara" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a>
          <a href="https://youtrust.jp/users/freddiefujiwara" target="_blank" rel="noopener">YOUTRUST <span class="arr">↗</span></a>
          <a href="https://fril.jp/shop/freddiefujiwara" target="_blank" rel="noopener">ラクマ <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} 藤原史和（Fumikazu Fujiwara）— freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import TitleSearch from './components/TitleSearch.vue';
import TagIndex from './components/TagIndex.vue';
import { buildSearchableArticles, fetchArticleTitles } from './services/api';
import { buildTagIndex, extractTagsMap, mergeTagsMaps } from './services/tags';
import { trackNavClick } from './analytics';
import { loadCachedList } from './services/listCache';

const year = new Date().getFullYear();

// Same destination as the footer's "最新記事（トップ）へ戻る" link:
// the first id in the article list is the latest article.
const latestArticlePath = ref('');
const searchableArticles = ref([]);
const searchState = ref('loading');
// Tag index under the hero, fed by the same titles payload as the
// search. Stays empty (and renders nothing) until the payload carries
// tags, so older API responses change nothing visually.
const tagsMap = ref({});
const tagIndex = computed(() =>
  buildTagIndex(searchableArticles.value, tagsMap.value)
);

onMounted(async () => {
  // Prime from the list cached on the previous visit so the search is
  // usable immediately; the fetch below refreshes it in the background.
  const cached = loadCachedList();
  if (cached?.ids?.length) {
    latestArticlePath.value = `/${cached.ids[0]}`;
    searchableArticles.value = buildSearchableArticles(cached);
    tagsMap.value = mergeTagsMaps(tagsMap.value, extractTagsMap(cached));
    if (searchableArticles.value.length) {
      searchState.value = 'ready';
    }
  }
  try {
    const data = await fetchArticleTitles();
    if (data?.ids?.[0]) {
      latestArticlePath.value = `/${data.ids[0]}`;
    }
    searchableArticles.value = buildSearchableArticles(data);
    tagsMap.value = mergeTagsMaps(tagsMap.value, extractTagsMap(data));
    searchState.value = 'ready';
  } catch {
    // If the fetch fails, primed data (when there is any) keeps the
    // search working; without it the search reports the failure
    // instead of pretending there are no hits, and the hero simply
    // stays non-clickable.
    if (!searchableArticles.value.length) {
      searchState.value = 'failed';
    }
  }
});
</script>
