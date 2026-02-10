import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { marked } from 'marked';
import { fetchArticle, fetchArticleList } from '../services/api';
import { resolveArticleId, buildNavigationLinks } from '../articleNavigation';

export function useBlog() {
  const route = useRoute();
  const router = useRouter();
  const article = ref(null);
  const articleIds = ref([]);
  const errorMessage = ref('');
  const currentId = ref('');
  const loading = ref(false);
  const articleCache = ref({});

  const articleHtml = computed(() => {
    if (!article.value) {
      return '';
    }
    return marked.parse(article.value.markdown ?? '');
  });

  const navigationLinks = computed(() =>
    buildNavigationLinks(articleIds.value, currentId.value)
  );

  const prevLink = computed(() => navigationLinks.value.prevLink);
  const nextLink = computed(() => navigationLinks.value.nextLink);
  const prevTitle = computed(() => articleCache.value[navigationLinks.value.prevId]?.title || '');
  const nextTitle = computed(() => articleCache.value[navigationLinks.value.nextId]?.title || '');

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

  const getArticleList = async () => {
    if (articleIds.value.length > 0) {
      return articleIds.value;
    }
    const data = await fetchArticleList();
    articleIds.value = data.ids;
    if (data.article_cache) {
      data.article_cache.forEach((item) => {
        articleCache.value[item.id] = item;
      });
    }
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

  const loadArticleFromLocation = async () => {
    if (loading.value) return;
    loading.value = true;
    try {
      const ids = await getArticleList();
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
      await getArticle(articleId);
      prefetch();
    } finally {
      loading.value = false;
    }
  };

  onMounted(async () => {
    try {
      await loadArticleFromLocation();
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
    errorMessage,
    prevLink,
    nextLink,
    prevTitle,
    nextTitle
  };
}
