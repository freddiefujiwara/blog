<template>
  <div>
    <nav class="site-nav">
      <a class="brand" :href="topHomeHref">{{ t('siteTitle') }}</a>
      <ul>
        <li><a :href="topHomeHref" @click="trackNavClick('top')">{{ t('navTop') }}</a></li>
        <li class="nav-section"><a :href="topProfileHref" @click="trackNavClick('about')">{{ t('navProfile') }}</a></li>
        <li class="nav-section"><a :href="topActivityHref" @click="trackNavClick('activity')">{{ t('navActivity') }}</a></li>
        <li class="nav-section"><a :href="topContactHref" @click="trackNavClick('contact')">{{ t('navContact') }}</a></li>
        <li><a :href="blogHomeHref" class="active" aria-current="page" @click="trackNavClick('blog')">{{ t('navBlog') }}</a></li>
        <li><a href="https://freddiefujiwara.com/list-of-stuff/" @click="trackNavClick('list')">{{ t('navList') }}</a></li>
        <li><a href="https://freddiefujiwara.com/music" @click="trackNavClick('music')">{{ t('navMusic') }} ♪<span v-if="musicPlayCount !== null" class="music-play-count">{{ formatMusicPlayCount(musicPlayCount) }}</span></a></li>
      </ul>
    </nav>
    <header class="header hero">
      <router-link
        v-if="latestArticlePath"
        :to="latestArticlePath"
        class="hero-inner hero-link"
      >
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1><span class="h1-name">{{ t('siteName') }}</span><span class="h1-sep" aria-hidden="true">｜</span><span class="h1-role">{{ t('siteRole') }}</span></h1>
      </router-link>
      <div v-else class="hero-inner">
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1><span class="h1-name">{{ t('siteName') }}</span><span class="h1-sep" aria-hidden="true">｜</span><span class="h1-role">{{ t('siteRole') }}</span></h1>
      </div>
    </header>
    <div class="layout">
      <div class="list-search">
        <TitleSearch :articles="searchableArticles" :state="searchState" />
      </div>
      <TagIndex :tags="tagIndex" />
      <router-view />
      <footer class="site-footer">
        <div class="foot-groups">
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerSite') }}</p>
            <div class="foot-links">
              <a :href="topHomeHref" target="_blank" rel="noopener">{{ t('navTop') }} <span class="arr">↗</span></a>
              <a :href="footerBlogHref" target="_blank" rel="noopener">{{ t('navBlog') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/list-of-stuff/" target="_blank" rel="noopener">{{ t('footerBelongings') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/bucket-list/" target="_blank" rel="noopener">{{ t('footerBucketList') }} <span class="arr">↗</span></a>
            </div>
          </div>
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerSns') }}</p>
            <div class="foot-links">
              <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
              <a href="https://x.com/freddiefujiwara" target="_blank" rel="noopener">X <span class="arr">↗</span></a>
              <a href="https://www.facebook.com/freddiefujiwara" target="_blank" rel="noopener">Facebook <span class="arr">↗</span></a>
            </div>
          </div>
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerReviews') }}</p>
            <div class="foot-links">
              <a href="https://www.google.com/maps/contrib/105456242747265663411/reviews" target="_blank" rel="noopener">{{ t('footerGoogleReviews') }} <span class="arr">↗</span></a>
              <a href="https://review.travel.rakuten.co.jp/reviewer/fumikazufujiwara" target="_blank" rel="noopener">{{ t('footerRakutenReviews') }} <span class="arr">↗</span></a>
              <a href="https://tabelog.com/rvwr/zegenvs/" target="_blank" rel="noopener">{{ t('footerTabelogReviews') }} <span class="arr">↗</span></a>
              <a href="https://retty.me/user/50281/" target="_blank" rel="noopener">{{ t('footerRettyReviews') }} <span class="arr">↗</span></a>
            </div>
          </div>
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerProfile') }}</p>
            <div class="foot-links">
              <a href="https://github.com/freddiefujiwara" target="_blank" rel="noopener">GitHub <span class="arr">↗</span></a>
              <a href="https://linkedin.com/in/freddiefujiwara" target="_blank" rel="noopener">LinkedIn <span class="arr">↗</span></a>
              <a href="https://youtrust.jp/users/freddiefujiwara" target="_blank" rel="noopener">YOUTRUST <span class="arr">↗</span></a>
              <a href="https://angl.jp/freddiefujiwara" target="_blank" rel="noopener">ANGEL PORT <span class="arr">↗</span></a>
              <a href="https://fril.jp/shop/freddiefujiwara" target="_blank" rel="noopener">ラクマ <span class="arr">↗</span></a>
            </div>
          </div>
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerTools') }}</p>
            <div class="foot-links">
              <a href="https://freddiefujiwara.com/xuexi/" target="_blank" rel="noopener">{{ t('toolXuexi') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/openapi-fetch/" target="_blank" rel="noopener">openapi-fetch <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/md2img/" target="_blank" rel="noopener">{{ t('toolMd2img') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/portfolio-treemap/" target="_blank" rel="noopener">{{ t('toolPortfolio') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/dtgwt/" target="_blank" rel="noopener">{{ t('toolDtgwt') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/node-qict/" target="_blank" rel="noopener">{{ t('toolQict') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/smtc/" target="_blank" rel="noopener">{{ t('toolSmtc') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/dtdt/" target="_blank" rel="noopener">{{ t('toolDtdt') }} <span class="arr">↗</span></a>
            </div>
          </div>
        </div>
        <div class="foot-lang">
          <LanguageSwitcher />
        </div>
        <p class="copy">© {{ year }} 藤原史和（Fumikazu Fujiwara）— freddiefujiwara.com</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import TitleSearch from './components/TitleSearch.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import TagIndex from './components/TagIndex.vue';
import { blogHomeUrl, contentLang, currentLang, MESSAGES, SUPPORTED_LANGS, routeLang, t, topPageUrl } from './services/i18n';
import { buildSearchableArticles, fetchArticleTitles } from './services/api';
import { buildTagIndex, extractTagsMap, mergeTagsMaps } from './services/tags';
import { trackNavClick } from './analytics';
import { loadCachedList } from './services/listCache';
import { fetchMusicPlayCount, formatMusicPlayCount } from './services/musicCount';

const year = new Date().getFullYear();

// The nav's blog link is the blog's own root: on a translated page
// it stays inside that language instead of dropping back to the
// Japanese root.
const blogHomeHref = computed(() =>
  (routeLang.value ? `/blog/${routeLang.value}/` : '/blog/')
);

// Links out to the top page (and the footer's blog link) follow
// the UI language the reader is browsing in: the top page has
// real /en/ and /zh/ pages, so an English reader lands there
// instead of on the Japanese page. Japanese keeps today's URLs
// exactly. Links to the other apps stay language-neutral.
const topHomeHref = computed(() => topPageUrl(currentLang.value));
const topProfileHref = computed(() => topPageUrl(currentLang.value, '#about'));
const topActivityHref = computed(() => topPageUrl(currentLang.value, '#activity'));
const topContactHref = computed(() => topPageUrl(currentLang.value, '#contact'));
const footerBlogHref = computed(() => blogHomeUrl(currentLang.value));

// The static document.title is the site title; article pages
// replace it with the article's own (untranslated) title and tag
// pages with theirs. When the UI language changes, only a title
// that is still one of the site titles follows the new language.
const SITE_TITLES = new Set(SUPPORTED_LANGS.map((lang) => MESSAGES[lang].siteTitle));
watch(currentLang, () => {
  if (SITE_TITLES.has(document.title)) {
    document.title = t('siteTitle');
  }
});
onMounted(() => {
  if (SITE_TITLES.has(document.title)) {
    document.title = t('siteTitle');
  }
});

// Cumulative 川口の歌 play count for the header nav, read from the
// top site's music-count.json. Stays null (and renders nothing)
// until a valid count arrives; any failure keeps it hidden.
const musicPlayCount = ref(null);

// Same destination as the footer's "最新記事（トップ）へ戻る" link:
// the first id in the article list is the latest article. The path
// follows the page's language, so the hero on a translated page
// links to the latest article in that language.
const latestArticleId = ref('');
const latestArticlePath = computed(() => {
  if (!latestArticleId.value) {
    return '';
  }
  const prefix = routeLang.value ? `/${routeLang.value}` : '';
  return `${prefix}/${latestArticleId.value}`;
});
const searchableArticles = ref([]);
const searchState = ref('loading');
// Tag index under the hero, fed by the same titles payload as the
// search. Stays empty (and renders nothing) until the payload carries
// tags, so older API responses change nothing visually.
const tagsMap = ref({});
const tagIndex = computed(() =>
  buildTagIndex(searchableArticles.value, tagsMap.value)
);

// Loads the titles payload in the current content language: it
// feeds the hero link, the title search and the tag index. Primed
// from the list cached on the previous visit (per language) so the
// search is usable immediately; the fetch refreshes it.
const loadTitles = async () => {
  const lang = contentLang.value;
  const cached = loadCachedList(lang);
  if (cached?.ids?.length) {
    latestArticleId.value = cached.ids[0];
    searchableArticles.value = buildSearchableArticles(cached);
    tagsMap.value = mergeTagsMaps(tagsMap.value, extractTagsMap(cached));
    if (searchableArticles.value.length) {
      searchState.value = 'ready';
    }
  }
  try {
    const data = await fetchArticleTitles(lang);
    if (data?.ids?.[0]) {
      latestArticleId.value = data.ids[0];
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
};

onMounted(async () => {
  // The play count is independent of the article list: fetch it in
  // parallel and fill the nav in when (and only when) it succeeds.
  fetchMusicPlayCount().then((count) => {
    if (count !== null) {
      musicPlayCount.value = count;
    }
  });
  loadTitles();
});

// A language switch changes the URL prefix; the search, tag index
// and hero must follow into the new language's titles.
watch(routeLang, () => {
  loadTitles();
});
</script>
