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
        <li><a href="https://freddiefujiwara.com/everything-i-own/" @click="trackNavClick('list')">{{ t('navList') }}</a></li>
        <li><a href="https://freddiefujiwara.com/music" @click="trackNavClick('music')">{{ t('navMusic') }} ♪<span v-if="musicPlayCount !== null" class="music-play-count">{{ formatMusicPlayCount(musicPlayCount) }}</span></a></li>
      </ul>
    </nav>
    <header class="header hero">
      <router-link
        :to="heroPath"
        class="hero-inner hero-link"
      >
        <p class="hero-place">KAWAGUCHI — BLOG</p>
        <h1><span class="h1-name">{{ t('siteName') }}</span><span class="h1-sep" aria-hidden="true">｜</span><span class="h1-role">{{ t('siteRole') }}</span></h1>
      </router-link>
    </header>
    <div v-if="showLogin" class="login-gate">
      <p>{{ t('signInRequired') }}</p>
      <div ref="signInButton" class="login-button"></div>
      <p v-if="signInError" class="login-error">{{ signInError }}</p>
    </div>
    <div v-else class="layout" :class="{ 'layout--article': isArticleLayout }">
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
              <a href="https://freddiefujiwara.com/everything-i-own/" target="_blank" rel="noopener">{{ t('footerBelongings') }} <span class="arr">↗</span></a>
              <a href="https://freddiefujiwara.com/bucket-list/" target="_blank" rel="noopener">{{ t('footerBucketList') }} <span class="arr">↗</span></a>
            </div>
          </div>
          <div class="foot-group">
            <p class="foot-group-title">{{ t('footerSns') }}</p>
            <div class="foot-links">
              <a href="https://www.instagram.com/freddiefujiwara" target="_blank" rel="noopener">Instagram <span class="arr">↗</span></a>
              <a href="https://x.com/freddiefujiwara" target="_blank" rel="noopener">X <span class="arr">↗</span></a>
              <a href="https://www.facebook.com/freddiefujiwara" target="_blank" rel="noopener">Facebook <span class="arr">↗</span></a>
              <a href="https://www.tiktok.com/@freddiefujiwara" target="_blank" rel="noopener">TikTok <span class="arr">↗</span></a>
              <a href="https://xhslink.cn/m/AuUUDYvFdOI" target="_blank" rel="noopener">小红书 <span class="arr">↗</span></a>
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
              <a href="https://zenn.dev/freddiefujiwara" target="_blank" rel="noopener">Zenn <span class="arr">↗</span></a>
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
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import TitleSearch from './components/TitleSearch.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import TagIndex from './components/TagIndex.vue';
import { blogHomeUrl, contentLang, currentLang, MESSAGES, SUPPORTED_LANGS, routeLang, t, topPageUrl } from './services/i18n';
import { buildSearchableArticles, fetchArticleTitles } from './services/api';
import { AuthRequiredError, exchangeSession, renderGoogleSignInButton } from './services/auth';
import { buildTagIndex, extractTagsMap, mergeTagsMaps } from './services/tags';
import { trackNavClick } from './analytics';
import { loadCachedList } from './services/listCache';
import { fetchMusicPlayCount, formatMusicPlayCount } from './services/musicCount';

const year = new Date().getFullYear();

// Layout variant: on article pages the search box and the tag
// index render below the article (the .layout--article ordering in
// style.css); on tag pages they are the page's controls and stay
// above the list. Every non-tag route is an article page.
const route = useRoute();
const isArticleLayout = computed(() => route.name !== 'tag');

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
// The hero is always a link: while the latest article is not known
// yet (titles still loading, or the fetch failed), it points at the
// language's home instead, which resolves to the latest article
// once it loads. A non-link hero left readers tapping a dead band.
const heroPath = computed(() =>
  latestArticlePath.value || (routeLang.value ? `/${routeLang.value}` : '/')
);
const searchableArticles = ref([]);
const searchState = ref('loading');
// Tag index, fed by the same titles payload as the search. It
// renders below the article on article pages and above the list
// on tag pages (see isArticleLayout). Stays empty (and renders
// nothing) until the payload carries tags, so older API responses
// change nothing visually.
const tagsMap = ref({});
const tagIndex = computed(() =>
  buildTagIndex(searchableArticles.value, tagsMap.value)
);

// Loads the titles payload in the current content language: it
// feeds the hero link, the title search and the tag index. Primed
// from the list cached on the previous visit (per language) so the
// search is usable immediately; the fetch refreshes it.
// Staging sign-in gate: the staging backend refuses reads without
// a session, so the first data load answers "unauthorized" and the
// gate below replaces the article layout (the same call-then-gate
// flow as the other auth-gated apps). Production builds never
// enter this state: their backend answers normally.
const showLogin = ref(false);
const signInButton = ref(null);
const signInError = ref('');

const startSignIn = async () => {
  if (!showLogin.value || !signInButton.value) {
    return;
  }
  try {
    await renderGoogleSignInButton(signInButton.value, async (credential) => {
      try {
        await exchangeSession(credential);
        signInError.value = '';
        showLogin.value = false;
        loadTitles();
      } catch {
        signInError.value = t('signInFailed');
      }
    });
  } catch {
    signInError.value = t('signInFailed');
  }
};

// The sign-in button only exists once the gate is shown; render it
// as soon as the gate replaces the layout.
watch(showLogin, (visible) => {
  if (visible) {
    nextTick(() => startSignIn());
  }
});

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
  } catch (error) {
    // An unauthorized answer means there is no (valid) session:
    // switch to the sign-in gate instead of reporting a failure.
    if (error instanceof AuthRequiredError) {
      showLogin.value = true;
      return;
    }
    // If the fetch fails, primed data (when there is any) keeps the
    // search working; without it the search reports the failure
    // instead of pretending there are no hits. The hero falls back
    // to the home link until a later load succeeds.
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
