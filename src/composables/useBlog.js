import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchArticle, fetchArticleList, fetchArticleTitles } from '../services/api';
import { trackArticleRender } from '../analytics';
import { loadCachedList, saveCachedList } from '../services/listCache';
import { renderMarkdown } from '../services/markdown';
import { DEFAULT_LANG, contentLang, t } from '../services/i18n';
import {
  resolveArticleId,
  extractRequestedId,
  buildNavigationLinks
} from '../articleNavigation';

export function useBlog() {
  const route = useRoute();
  const router = useRouter();
  const article = ref(null);
  const articleIds = ref([]);
  const errorMessage = ref('');
  const currentId = ref('');
  const loading = ref(false);
  const articleCache = ref({});
  const pendingArticleFetches = new Map();
  let listRefreshInFlight = false;
  // The language the in-memory article list was loaded in. Article
  // ids are the same in every language, but titles are not, so a
  // language switch must reload the list even when ids are present.
  let loadedListLang = null;
  // The language of the currently displayed article. Switching the
  // language of the SAME article (same id, new prefix) must refetch
  // it, so "already showing this id" is only a shortcut within one
  // language.
  let displayedLang = null;

  // Session caches are keyed per language: the same article id in
  // Japanese and in translation are different content and must
  // never be served in each other's place.
  const cacheKey = (lang, id) => `${lang}:${id}`;

  // Japanese API calls keep their original shape exactly (no lang
  // argument, no lang parameter on the wire); only translated pages
  // pass the language through.
  const fetchArticleForLang = (id, lang) =>
    (lang === DEFAULT_LANG ? fetchArticle(id) : fetchArticle(id, lang));
  const fetchTitlesForLang = (lang) =>
    (lang === DEFAULT_LANG ? fetchArticleTitles() : fetchArticleTitles(lang));

  // The full list (with pre-cached article bodies) exists only in
  // Japanese. Translated pages use the titles response as their
  // list source instead: it carries the same ids, titles and tags,
  // just no article bodies, which are fetched per article anyway.
  const fetchListForLang = async (lang) => {
    if (lang === DEFAULT_LANG) {
      return fetchArticleList();
    }
    const data = await fetchTitlesForLang(lang);
    return { ...data, article_cache: [] };
  };

  const articleHtml = computed(() => {
    if (!article.value) {
      return '';
    }
    return renderMarkdown(article.value.markdown);
  });

  const navigationLinks = computed(() =>
    buildNavigationLinks(
      articleIds.value,
      currentId.value,
      contentLang.value === DEFAULT_LANG ? '' : `/${contentLang.value}`
    )
  );

  const prevLink = computed(() => navigationLinks.value.prevLink);
  const nextLink = computed(() => navigationLinks.value.nextLink);
  const prevTitle = computed(() => articleCache.value[cacheKey(contentLang.value, navigationLinks.value.prevId)]?.title || '');
  const nextTitle = computed(() => articleCache.value[cacheKey(contentLang.value, navigationLinks.value.nextId)]?.title || '');

  // Starts fetching an article before the article list has arrived, so a
  // deep-linked article downloads in parallel with the list instead of
  // waiting for it. The pending promise is consumed by getArticle.
  const startArticleFetch = (id, lang) => {
    const key = cacheKey(lang, id);
    if (!id || articleCache.value[key] || pendingArticleFetches.has(key)) {
      return;
    }
    const promise = fetchArticleForLang(id, lang);
    // If the fetch ends up unused (e.g. the id is not in the list), its
    // rejection must not surface as an unhandled rejection.
    promise.catch(() => {});
    pendingArticleFetches.set(key, promise);
  };

  // Makes a fetched article the displayed one and remembers it in
  // the session cache.
  const adoptArticle = (lang, id, data) => {
    articleCache.value[cacheKey(lang, id)] = data;
    article.value = data;
    currentId.value = id;
    displayedLang = lang;
    errorMessage.value = '';
    if (data?.title) {
      document.title = data.title;
    }
  };

  const getArticle = async (id, lang) => {
    const key = cacheKey(lang, id);
    if (articleCache.value[key]) {
      adoptArticle(lang, id, articleCache.value[key]);
      return;
    }

    const pending = pendingArticleFetches.get(key);
    if (pending) {
      pendingArticleFetches.delete(key);
      try {
        adoptArticle(lang, id, await pending);
        return;
      } catch {
        // Fall through to a fresh fetch so error handling matches the
        // behavior when no early fetch was started.
      }
    }

    adoptArticle(lang, id, await fetchArticleForLang(id, lang));
  };

  const getLocationContext = () => {
    // With a route, prepend /blog to match what resolveArticleId
    // expects (route.path starts with /). A language prefix the
    // route itself declares is stripped first: resolveArticleId
    // resolves article ids, and "en/<id>" is not one.
    let path;
    if (route) {
      const prefix = route.params?.lang ? `/${route.params.lang}` : '';
      const routePath = prefix && route.path.startsWith(prefix)
        ? route.path.slice(prefix.length) || '/'
        : route.path;
      path = routePath === '/' ? '/blog' : `/blog${routePath}`;
    } else {
      path = window.location.pathname;
    }
    return {
      path,
      search: window.location.search,
      hash: window.location.hash
    };
  };

  // Clears the displayed article while its replacement is on its way.
  const clearCurrentArticle = () => {
    article.value = null;
    errorMessage.value = '';
  };

  const applyListData = (data, lang) => {
    articleIds.value = data.ids;
    loadedListLang = lang;
    if (data.article_cache) {
      data.article_cache.forEach((item) => {
        articleCache.value[cacheKey(lang, item.id)] = item;
      });
    }
  };

  // Seeds the in-memory list from the list persisted on a previous visit and
  // refreshes it in the background, so repeat visits render immediately.
  // Returns true when the in-memory list came from the persisted cache (and
  // may therefore be stale).
  const primeListFromCache = (lang) => {
    if (articleIds.value.length > 0 && loadedListLang === lang) {
      return false;
    }
    const cached = loadCachedList(lang);
    if (!cached) {
      return false;
    }
    applyListData(cached, lang);
    refreshArticleList(lang);
    return true;
  };

  const refreshArticleList = async (lang) => {
    if (listRefreshInFlight) {
      return;
    }
    listRefreshInFlight = true;
    try {
      const data = await fetchListForLang(lang);
      applyListData(data, lang);
      saveCachedList(data, lang);
      // Keep the displayed article in sync when the refresh brought a
      // newer version of it — but only a refresh in the language the
      // reader is currently looking at may touch the display.
      const fresh = currentId.value && lang === contentLang.value
        ? articleCache.value[cacheKey(lang, currentId.value)]
        : null;
      if (fresh && article.value && fresh !== article.value) {
        article.value = fresh;
        if (fresh.title) {
          document.title = fresh.title;
        }
      }
    } catch {
      // Keep showing the persisted list when the refresh fails.
    } finally {
      listRefreshInFlight = false;
    }
  };

  const getArticleList = async (lang) => {
    if (articleIds.value.length > 0 && loadedListLang === lang) {
      return articleIds.value;
    }
    primeListFromCache(lang);
    if (articleIds.value.length > 0 && loadedListLang === lang) {
      return articleIds.value;
    }
    // Fast path: learn the ids from the lightweight titles response
    // (no article bodies) and let the full list catch up in the
    // background. The full list can take tens of seconds when the API
    // cache is cold, and the reader should not have to wait for ten
    // articles to read one. If the titles response is unavailable
    // (older API deployment), fall back to the full list — in
    // Japanese only; a translated page has no Japanese fallback and
    // surfaces the failure instead of mixing languages.
    try {
      const data = await fetchTitlesForLang(lang);
      if (data?.ids?.length) {
        articleIds.value = data.ids;
        loadedListLang = lang;
        refreshArticleList(lang);
        return data.ids;
      }
    } catch {
      // Fall through to the full list.
    }
    const data = await fetchListForLang(lang);
    applyListData(data, lang);
    saveCachedList(data, lang);
    return data.ids;
  };

  const prefetch = (lang) => {
    const { prevId, nextId } = navigationLinks.value;
    [prevId, nextId].forEach((id) => {
      const key = cacheKey(lang, id);
      if (id && !articleCache.value[key]) {
        fetchArticleForLang(id, lang)
          .then((data) => {
            articleCache.value[key] = data;
          })
          .catch(() => {
            // Ignore prefetch errors
          });
      }
    });
  };

  // Article ids whose display time has already been reported in
  // this session: one sample per article keeps the GA averages
  // focused on first displays instead of instant cache revisits.
  const reportedRenderIds = new Set();

  // Reports the article's display time once Vue has rendered the
  // body and the browser has had a frame to paint it. `startedAt`
  // is a performance.now() timestamp taken when the navigation
  // began; for the first article it is 0, because performance.now()
  // already counts from the start of the page load. `phases`
  // carries the two waits inside the total — the article list
  // and the article body — measured by loadArticleFromLocation,
  // so a slow display can be attributed to the leg that stalled.
  const reportArticleRender = (id, startedAt, phases = {}, lang = DEFAULT_LANG) => {
    const reportKey = cacheKey(lang, id);
    if (!id || reportedRenderIds.has(reportKey)) return;
    reportedRenderIds.add(reportKey);
    nextTick(() => {
      const report = () => trackArticleRender(performance.now() - startedAt, phases);
      const raf =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : null;
      if (raf) {
        raf(report);
      } else {
        report();
      }
    });
  };

  // Consumes the article fetch startArticleFetch began for a
  // deep-linked visit. Returns the article when it arrived as a
  // real article, and null when the fetch failed or the API
  // answered with an error payload (a document outside the blog
  // folder gets an error payload, not a failed request), so the
  // caller can fall back to resolving through the article list.
  const takeStartedArticle = async (id, lang) => {
    const key = cacheKey(lang, id);
    if (articleCache.value[key]) {
      return articleCache.value[key];
    }
    const pending = pendingArticleFetches.get(key);
    if (!pending) {
      return null;
    }
    pendingArticleFetches.delete(key);
    try {
      const data = await pending;
      return data && !data.error ? data : null;
    } catch {
      return null;
    }
  };

  const loadArticleFromLocation = async (initial = false) => {
    if (loading.value) return;
    const startedAt = initial ? 0 : performance.now();
    // The language this load runs in, captured once: a language
    // switch mid-load starts its own load instead of mixing.
    const lang = contentLang.value;
    loading.value = true;
    try {
      const usedCachedList = primeListFromCache(lang);
      // On a direct article visit, start downloading the article right away
      // instead of waiting for the article list to arrive first.
      const requestedId = route
        ? route.params?.id || ''
        : extractRequestedId(getLocationContext());
      if (requestedId) {
        startArticleFetch(requestedId, lang);
      }
      const listStartedAt = performance.now();
      const listPromise = getArticleList(lang);
      // The list keeps resolving in the background even when the
      // article wins the race below; the rejection is surfaced by
      // whichever path ends up awaiting the promise.
      listPromise.catch(() => {});

      // A deep-linked article no longer waits for the list. The
      // list only decides which article an id-less URL means and
      // feeds the navigation links, and a successful article fetch
      // already proves the id names a real article (the API checks
      // folder membership itself), so the article is displayed as
      // soon as it arrives. The list still populates articleIds
      // through getArticleList's own side effects, so navigation
      // catches up on its own. An id the API refuses (an error
      // payload) or cannot fetch falls back to the list-based
      // resolution below, exactly as before.
      if (requestedId && (requestedId !== currentId.value || lang !== displayedLang)) {
        // Match the list-based path below: the previous article
        // clears while the new one is on its way.
        clearCurrentArticle();
        const early = await takeStartedArticle(requestedId, lang);
        if (early) {
          adoptArticle(lang, requestedId, early);
          // No list_ms is reported: the list was not waited for,
          // so there is no list wait to attribute to this display.
          reportArticleRender(requestedId, startedAt, {
            fetchMs: performance.now() - listStartedAt
          }, lang);
          listPromise.then(() => prefetch(lang), () => {});
          return;
        }
      }

      let ids = await listPromise;
      if (usedCachedList && requestedId && !ids.includes(requestedId)) {
        // The persisted list predates the requested article, so resolving
        // against it would fall back to a stale "newest" article and send
        // the reader to the wrong post. Fetch the fresh list first.
        try {
          const data = await fetchListForLang(lang);
          applyListData(data, lang);
          saveCachedList(data, lang);
          ids = data.ids;
        } catch {
          // Keep the persisted list; the fallback below still applies.
        }
      }
      const listMs = performance.now() - listStartedAt;
      const articleId = resolveArticleId(ids, getLocationContext());
      if (!articleId) {
        throw new Error(t('latestNotFound'));
      }

      // The root routes (Japanese and translated alike) replace
      // themselves with the newest article's URL; an article route
      // whose id resolved differently does the same.
      const isRootRoute = route
        && (route.name === 'home' || route.name === 'lang-home' || route.path === '/');
      if (route && (isRootRoute || (route.params.id && route.params.id !== articleId))) {
        const params = route.params.lang
          ? { lang: route.params.lang, id: articleId }
          : { id: articleId };
        router.replace({ name: 'post', params });
        loading.value = false;
        return;
      }

      if (articleId === currentId.value && article.value && lang === displayedLang) {
        return;
      }
      clearCurrentArticle();
      const fetchStartedAt = performance.now();
      await getArticle(articleId, lang);
      const fetchMs = performance.now() - fetchStartedAt;
      reportArticleRender(articleId, startedAt, { listMs, fetchMs }, lang);
      prefetch(lang);
    } finally {
      loading.value = false;
    }
  };

  const loadSafely = async (initial = false) => {
    try {
      await loadArticleFromLocation(initial);
    } catch (error) {
      errorMessage.value = error?.message ?? t('loadFailed');
    }
  };

  onMounted(() => loadSafely(true));

  watch(
    () => route?.path,
    () => loadSafely()
  );

  return {
    article,
    articleHtml,
    articleIds,
    currentId,
    errorMessage,
    prevLink,
    nextLink,
    prevTitle,
    nextTitle
  };
}
