import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchArticle, fetchArticleList, fetchArticleTitles } from '../services/api';
import { trackArticleRender } from '../analytics';
import { loadCachedList, saveCachedList } from '../services/listCache';
import { renderMarkdown } from '../services/markdown';
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

  const articleHtml = computed(() => {
    if (!article.value) {
      return '';
    }
    return renderMarkdown(article.value.markdown);
  });

  const navigationLinks = computed(() =>
    buildNavigationLinks(articleIds.value, currentId.value)
  );

  const prevLink = computed(() => navigationLinks.value.prevLink);
  const nextLink = computed(() => navigationLinks.value.nextLink);
  const prevTitle = computed(() => articleCache.value[navigationLinks.value.prevId]?.title || '');
  const nextTitle = computed(() => articleCache.value[navigationLinks.value.nextId]?.title || '');

  // Starts fetching an article before the article list has arrived, so a
  // deep-linked article downloads in parallel with the list instead of
  // waiting for it. The pending promise is consumed by getArticle.
  const startArticleFetch = (id) => {
    if (!id || articleCache.value[id] || pendingArticleFetches.has(id)) {
      return;
    }
    const promise = fetchArticle(id);
    // If the fetch ends up unused (e.g. the id is not in the list), its
    // rejection must not surface as an unhandled rejection.
    promise.catch(() => {});
    pendingArticleFetches.set(id, promise);
  };

  const getArticle = async (id) => {
    if (articleCache.value[id]) {
      article.value = articleCache.value[id];
      currentId.value = id;
      errorMessage.value = '';
      if (article.value?.title) {
        document.title = article.value.title;
      }
      return;
    }

    const pending = pendingArticleFetches.get(id);
    if (pending) {
      pendingArticleFetches.delete(id);
      try {
        const data = await pending;
        articleCache.value[id] = data;
        article.value = data;
        currentId.value = id;
        errorMessage.value = '';
        if (data?.title) {
          document.title = data.title;
        }
        return;
      } catch {
        // Fall through to a fresh fetch so error handling matches the
        // behavior when no early fetch was started.
      }
    }

    try {
      const data = await fetchArticle(id);
      articleCache.value[id] = data;
      article.value = data;
      currentId.value = id;
      errorMessage.value = '';
      if (data?.title) {
        document.title = data.title;
      }
    } catch (error) {
      throw error;
    }
  };

  const getLocationContext = () => {
    if (route) {
      // Prepend /blog to match what resolveArticleId expects
      // route.path starts with /
      const path = route.path === '/' ? '/blog' : `/blog${route.path}`;
      return {
        path,
        search: window.location.search,
        hash: window.location.hash
      };
    }
    return {
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    };
  };

  const applyListData = (data) => {
    articleIds.value = data.ids;
    if (data.article_cache) {
      data.article_cache.forEach((item) => {
        articleCache.value[item.id] = item;
      });
    }
  };

  // Seeds the in-memory list from the list persisted on a previous visit and
  // refreshes it in the background, so repeat visits render immediately.
  // Returns true when the in-memory list came from the persisted cache (and
  // may therefore be stale).
  const primeListFromCache = () => {
    if (articleIds.value.length > 0) {
      return false;
    }
    const cached = loadCachedList();
    if (!cached) {
      return false;
    }
    applyListData(cached);
    refreshArticleList();
    return true;
  };

  const refreshArticleList = async () => {
    if (listRefreshInFlight) {
      return;
    }
    listRefreshInFlight = true;
    try {
      const data = await fetchArticleList();
      applyListData(data);
      saveCachedList(data);
      // Keep the displayed article in sync when the refresh brought a
      // newer version of it.
      const fresh = currentId.value
        ? articleCache.value[currentId.value]
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

  const getArticleList = async () => {
    if (articleIds.value.length > 0) {
      return articleIds.value;
    }
    primeListFromCache();
    if (articleIds.value.length > 0) {
      return articleIds.value;
    }
    // Fast path: learn the ids from the lightweight titles response
    // (no article bodies) and let the full list catch up in the
    // background. The full list can take tens of seconds when the API
    // cache is cold, and the reader should not have to wait for ten
    // articles to read one. If the titles response is unavailable
    // (older API deployment), fall back to the full list.
    try {
      const data = await fetchArticleTitles();
      if (data?.ids?.length) {
        articleIds.value = data.ids;
        refreshArticleList();
        return data.ids;
      }
    } catch {
      // Fall through to the full list.
    }
    const data = await fetchArticleList();
    applyListData(data);
    saveCachedList(data);
    return data.ids;
  };

  const prefetch = () => {
    const { prevId, nextId } = navigationLinks.value;
    [prevId, nextId].forEach((id) => {
      if (id && !articleCache.value[id]) {
        fetchArticle(id)
          .then((data) => {
            articleCache.value[id] = data;
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
  const reportArticleRender = (id, startedAt, phases = {}) => {
    if (!id || reportedRenderIds.has(id)) return;
    reportedRenderIds.add(id);
    nextTick(() => {
      const raf =
        typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : null;
      if (raf) {
        raf(() => trackArticleRender(performance.now() - startedAt, phases));
      } else {
        trackArticleRender(performance.now() - startedAt, phases);
      }
    });
  };

  const loadArticleFromLocation = async (initial = false) => {
    if (loading.value) return;
    const startedAt = initial ? 0 : performance.now();
    loading.value = true;
    try {
      const usedCachedList = primeListFromCache();
      // On a direct article visit, start downloading the article right away
      // instead of waiting for the article list to arrive first.
      const requestedId = route
        ? route.params?.id || ''
        : extractRequestedId(getLocationContext());
      if (requestedId) {
        startArticleFetch(requestedId);
      }
      const listStartedAt = performance.now();
      let ids = await getArticleList();
      if (usedCachedList && requestedId && !ids.includes(requestedId)) {
        // The persisted list predates the requested article, so resolving
        // against it would fall back to a stale "newest" article and send
        // the reader to the wrong post. Fetch the fresh list first.
        try {
          const data = await fetchArticleList();
          applyListData(data);
          saveCachedList(data);
          ids = data.ids;
        } catch {
          // Keep the persisted list; the fallback below still applies.
        }
      }
      const listMs = performance.now() - listStartedAt;
      const articleId = resolveArticleId(ids, getLocationContext());
      if (!articleId) {
        throw new Error('最新記事が見つかりませんでした。');
      }

      if (route && (route.path === '/' || (route.params.id && route.params.id !== articleId))) {
        router.replace({ name: 'post', params: { id: articleId } });
        loading.value = false;
        return;
      }

      if (articleId === currentId.value && article.value) {
        return;
      }
      article.value = null;
      errorMessage.value = '';
      const fetchStartedAt = performance.now();
      await getArticle(articleId);
      const fetchMs = performance.now() - fetchStartedAt;
      reportArticleRender(articleId, startedAt, { listMs, fetchMs });
      prefetch();
    } finally {
      loading.value = false;
    }
  };

  onMounted(async () => {
    try {
      await loadArticleFromLocation(true);
    } catch (error) {
      errorMessage.value = error?.message ?? '読み込みに失敗しました。';
    }
  });

  watch(
    () => route?.path,
    async () => {
      try {
        await loadArticleFromLocation();
      } catch (error) {
        errorMessage.value = error?.message ?? '読み込みに失敗しました。';
      }
    }
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
