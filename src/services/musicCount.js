import { currentLang, t } from './i18n';

// Fetches the cumulative 川口の歌 play count shown in the shared
// header nav. The count lives in a tiny JSON file on the top site
// (https://freddiefujiwara.com/music-count.json), which the top
// site's static generation refreshes from ga-gas's public tally —
// so the header never calls GAS on each page view. Any failure
// (the file does not exist yet, a network error, a malformed
// payload) resolves to null, and the header simply shows no count.
export const MUSIC_COUNT_URL = 'https://freddiefujiwara.com/music-count.json';

export async function fetchMusicPlayCount(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(MUSIC_COUNT_URL);
    if (!res?.ok) {
      return null;
    }
    const data = await res.json();
    const count = data?.count;
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      return null;
    }
    return count;
  } catch {
    return null;
  }
}

const COUNT_LOCALES = { ja: 'ja-JP', en: 'en-US', zh: 'zh-CN' };

export function formatMusicPlayCount(count) {
  const formatted = count.toLocaleString(COUNT_LOCALES[currentLang.value] ?? 'ja-JP');
  return t('musicPlayCount', { count: formatted });
}
