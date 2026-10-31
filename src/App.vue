<template>
  <div>
    <nav class="site-nav">
      <a class="brand" href="https://freddiefujiwara.com/">藤原史和｜川口を歩くQAエンジニア</a>
      <ul>
        <li><a href="https://freddiefujiwara.com/#about">プロフィール</a></li>
        <li><a href="https://freddiefujiwara.com/#activity">活動・発信</a></li>
        <li><a href="https://freddiefujiwara.com/#contact">情報交換</a></li>
        <li><a href="/blog/">ブログ</a></li>
      </ul>
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
    </header>
    <div class="layout">
      <router-view />
      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
          <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
          <a href="https://www.google.com/maps/contrib/105456242747265663411/reviews" target="_blank" rel="noopener">Googleマップの口コミ <span class="arr">↗</span></a>
          <a href="https://review.travel.rakuten.co.jp/reviewer/fumikazufujiwara" target="_blank" rel="noopener">楽天トラベルの口コミ <span class="arr">↗</span></a>
          <a href="https://tabelog.com/rvwr/zegenvs/" target="_blank" rel="noopener">食べログの口コミ <span class="arr">↗</span></a>
          <a href="https://x.com/freddiefujiwara" target="_blank" rel="noopener">X <span class="arr">↗</span></a>
          <a href="https://github.com/freddiefujiwara" target="_blank" rel="noopener">GitHub <span class="arr">↗</span></a>
          <a href="https://linkedin.com/in/freddiefujiwara" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a>
        </div>
        <p class="copy">© {{ year }} 藤原史和（Fumikazu Fujiwara）— freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchArticleList } from './services/api';

const year = new Date().getFullYear();

// Same destination as the footer's "最新記事（トップ）へ戻る" link:
// the first id in the article list is the latest article.
const latestArticlePath = ref('');

onMounted(async () => {
  try {
    const data = await fetchArticleList();
    if (data?.ids?.[0]) {
      latestArticlePath.value = `/${data.ids[0]}`;
    }
  } catch {
    // If the list fails to load, the hero simply stays non-clickable.
  }
});
</script>
