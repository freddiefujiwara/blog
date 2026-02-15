import { ref } from 'vue';
import { fetchRSS as apiFetchRSS } from '../services/api';

const rssXml = ref(null);
const isFetching = ref(false);

export function useRSS() {
  const fetchRSS = async () => {
    if (rssXml.value || isFetching.value) return;
    isFetching.value = true;
    try {
      rssXml.value = await apiFetchRSS();
    } catch (error) {
      console.error('Failed to fetch RSS:', error);
    } finally {
      isFetching.value = false;
    }
  };

  return {
    rssXml,
    fetchRSS
  };
}
