import { ref, computed, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
import { fetchArticle, fetchArticleList } from '../services/api';
import { resolveArticleId, buildNavigationLinks } from '../articleNavigation';

export function useBlog() {
  const article = ref(null);
  const articleIds = ref([]);
  const errorMessage = ref('');
  const currentId = ref('');
  const loading = ref(false);

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

  const getArticle = async (id) => {
    try {
      const data = await fetchArticle(id);
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

  const getLocationContext = () => ({
    path: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
  });

  const getArticleList = async () => {
    if (articleIds.value.length > 0) {
      return articleIds.value;
    }
    const ids = await fetchArticleList();
    articleIds.value = ids;
    return ids;
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
      if (articleId === currentId.value && article.value) {
        return;
      }
      article.value = null;
      errorMessage.value = '';
      await getArticle(articleId);
    } finally {
      loading.value = false;
    }
  };

  const handleHashChange = async () => {
    try {
      await loadArticleFromLocation();
    } catch (error) {
      errorMessage.value = error?.message ?? '読み込みに失敗しました。';
    }
  };

  onMounted(async () => {
    try {
      await loadArticleFromLocation();
    } catch (error) {
      errorMessage.value = error?.message ?? '読み込みに失敗しました。';
    }
    window.addEventListener('hashchange', handleHashChange);
  });

  onUnmounted(() => {
    window.removeEventListener('hashchange', handleHashChange);
  });

  return {
    article,
    articleHtml,
    errorMessage,
    prevLink,
    nextLink
  };
}
