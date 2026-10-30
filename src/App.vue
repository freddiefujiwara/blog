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
      <div class="hero-inner">
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1>藤原史和｜川口を歩くQAエンジニア</h1>
      </div>
    </header>
    <div class="layout">
      <router-view />
      <footer class="site-footer">
        <div class="foot-links">
          <a href="https://freddiefujiwara.com/" target="_blank" rel="noopener">トップ <span class="arr">↗</span></a>
          <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
          <a href="https://www.google.com/maps/contrib/105456242747265663411/reviews" target="_blank" rel="noopener">Googleマップの口コミ <span class="arr">↗</span></a>
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
const year = new Date().getFullYear();
</script>
