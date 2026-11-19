import { computed, ref } from 'vue';
import { isStagingBuild } from '../staging-banner';

// UI language for the blog chrome: the header, search, tag index,
// footer, share links and the music player's labels. Japanese is
// the default and the fallback for any missing key, so a partially
// translated dictionary can never leave a hole in the page.
// Article content follows the URL instead (see routeLang below):
// Japanese at the plain URLs, translated under /blog/en/… and
// /blog/zh/…. Tag names stay Japanese as data in every language
// (API values, route params, cache keys); only their display
// labels translate (see TAG_LABELS below).
export const SUPPORTED_LANGS = ['ja', 'en', 'zh'];
export const DEFAULT_LANG = 'ja';

// The value written to <html lang="..."> for each language.
export const HTML_LANG = { ja: 'ja', en: 'en', zh: 'zh-CN' };

// One language preference for the whole site: the top page and
// the blog share this key (same origin), so the language a
// visitor sees on one carries over to the other — the top page
// records its current language here on every load.
// Environment-separated like the list cache (services/listCache):
// production and staging are served from the same origin, so an
// unscoped key would let one environment's preference leak into
// the other.
export const LANGUAGE_STORAGE_KEY = isStagingBuild()
  ? 'site:lang:v1:staging'
  : 'site:lang:v1';

// Where the preference lived while it was the blog's alone.
// Reads fall back to it (see readStoredLang) so a choice made
// before the key was shared is not lost; writes go to the
// shared key only.
export const LEGACY_LANGUAGE_STORAGE_KEY = isStagingBuild()
  ? 'blog:lang:v1:staging'
  : 'blog:lang:v1';

export const MESSAGES = {
  ja: {
    siteName: '藤原史和',
    siteRole: '川口を歩くQAエンジニア',
    siteTitle: '藤原史和｜川口を歩くQAエンジニア',
    navTop: 'トップ',
    navProfile: 'プロフィール',
    navActivity: '活動・発信',
    navContact: '情報交換',
    navBlog: 'ブログ',
    navList: '持ち物リスト',
    navMusic: '川口の歌',
    musicPlayCount: '{count}回再生',
    language: '言語',
    searchPlaceholder: '記事タイトルで探す',
    searchLoading: '検索中…',
    loadFailedReload: '読み込みに失敗しました。再読み込みしてください',
    searchEmpty: '該当する記事がありません',
    tagsHeading: 'タグ',
    tagPageTitle: 'タグ：{tag}',
    tagEmpty: 'このタグの記事はまだありません',
    tocHeading: '目次',
    prevArticle: '前の記事',
    nextArticle: '次の記事',
    prevArticleWithTitle: '前の記事: {title}',
    nextArticleWithTitle: '次の記事: {title}',
    shareHeading: 'この記事をシェアする',
    copyLink: 'リンクをコピー',
    copied: 'コピーしました',
    copy: 'コピー',
    copyDone: 'コピー完了',
    loading: '読み込み中...',
    backToLatest: '最新記事（トップ）へ戻る',
    loadFailed: '読み込みに失敗しました。',
    latestNotFound: '最新記事が見つかりませんでした。',
    articleFetchFailed: '記事の取得に失敗しました。',
    articleListFetchFailed: '記事一覧の取得に失敗しました。',
    articleTitlesFetchFailed: '記事タイトル一覧の取得に失敗しました。',
    rssFetchFailed: 'RSSの取得に失敗しました。',
    footerSite: 'このサイト',
    footerSns: 'SNS',
    footerReviews: '口コミ',
    footerProfile: 'プロフィール・その他',
    footerTools: '自作ツール',
    footerBelongings: '持ち物',
    footerBucketList: 'バケットリスト',
    footerGoogleReviews: 'Googleマップの口コミ',
    footerRakutenReviews: '楽天トラベルの口コミ',
    footerTabelogReviews: '食べログの口コミ',
    footerRettyReviews: 'Rettyの口コミ',
    toolXuexi: '学习（中国語の復習）',
    toolMd2img: 'md2img（Markdown to Image）',
    toolPortfolio: 'portfolio-treemap（ポートフォリオ構成図）',
    toolDtgwt: 'dtgwt（デシジョンテーブル→Given/When/Then）',
    toolQict: 'node-qict（ペアワイズ法のテストケース生成）',
    toolSmtc: 'smtc（状態遷移のテストケース生成）',
    toolDtdt: 'dtdt（デシジョンツリー→デシジョンテーブル）',
    playerPrev: '前へ',
    playerNext: '次へ',
    playerPlay: '再生',
    playerPause: '一時停止',
    playerLoading: '読み込み中',
    playerSeek: '再生位置',
    repeatNone: 'リピート：なし',
    repeatAll: 'リピート：全曲',
    repeatOne: 'リピート：1曲',
    shuffleOn: 'ランダム：オン',
    shuffleOff: 'ランダム：オフ',
    playerLoadError: '音源を読み込めませんでした',
    lyricsLabel: '歌詞',
    itemLink: 'この項目へのリンク'
  },
  en: {
    siteName: 'Fumikazu Fujiwara',
    siteRole: 'A QA engineer walking Kawaguchi',
    siteTitle: 'Fumikazu Fujiwara | A QA engineer walking Kawaguchi',
    navTop: 'Top',
    navProfile: 'Profile',
    navActivity: 'Activities',
    navContact: 'Contact',
    navBlog: 'Blog',
    navList: 'What I Carry',
    navMusic: 'Songs of Kawaguchi',
    musicPlayCount: '{count} plays',
    language: 'Language',
    searchPlaceholder: 'Search by title',
    searchLoading: 'Searching…',
    loadFailedReload: 'Failed to load. Please reload the page.',
    searchEmpty: 'No articles match your search.',
    tagsHeading: 'Tags',
    tagPageTitle: 'Tag: {tag}',
    tagEmpty: 'No articles with this tag yet.',
    tocHeading: 'Contents',
    prevArticle: 'Previous article',
    nextArticle: 'Next article',
    prevArticleWithTitle: 'Previous article: {title}',
    nextArticleWithTitle: 'Next article: {title}',
    shareHeading: 'Share this article',
    copyLink: 'Copy link',
    copied: 'Copied',
    copy: 'Copy',
    copyDone: 'Copied',
    loading: 'Loading...',
    backToLatest: 'Back to the latest article',
    loadFailed: 'Failed to load.',
    latestNotFound: 'The latest article was not found.',
    articleFetchFailed: 'Failed to fetch the article.',
    articleListFetchFailed: 'Failed to fetch the article list.',
    articleTitlesFetchFailed: 'Failed to fetch the article titles.',
    rssFetchFailed: 'Failed to fetch the RSS feed.',
    footerSite: 'This site',
    footerSns: 'SNS',
    footerReviews: 'Reviews',
    footerProfile: 'Profile & more',
    footerTools: 'My tools',
    footerBelongings: 'Belongings',
    footerBucketList: 'Bucket list',
    footerGoogleReviews: 'Google Maps reviews',
    footerRakutenReviews: 'Rakuten Travel reviews',
    footerTabelogReviews: 'Tabelog reviews',
    footerRettyReviews: 'Retty reviews',
    toolXuexi: '学习 (Chinese review)',
    toolMd2img: 'md2img (Markdown to Image)',
    toolPortfolio: 'portfolio-treemap (portfolio chart)',
    toolDtgwt: 'dtgwt (decision table → Given/When/Then)',
    toolQict: 'node-qict (pairwise test-case generator)',
    toolSmtc: 'smtc (state-transition test-case generator)',
    toolDtdt: 'dtdt (decision tree → decision table)',
    playerPrev: 'Previous',
    playerNext: 'Next',
    playerPlay: 'Play',
    playerPause: 'Pause',
    playerLoading: 'Loading',
    playerSeek: 'Playback position',
    repeatNone: 'Repeat: off',
    repeatAll: 'Repeat: all',
    repeatOne: 'Repeat: one',
    shuffleOn: 'Shuffle: on',
    shuffleOff: 'Shuffle: off',
    playerLoadError: 'Could not load the audio.',
    lyricsLabel: 'Lyrics',
    itemLink: 'Link to this item'
  },
  zh: {
    siteName: '藤原史和',
    siteRole: '行走川口的QA工程师',
    siteTitle: '藤原史和｜行走川口的QA工程师',
    navTop: '首页',
    navProfile: '个人简介',
    navActivity: '活动动态',
    navContact: '信息交流',
    navBlog: '博客',
    navList: '随身物品',
    navMusic: '川口之歌',
    musicPlayCount: '{count}次播放',
    language: '语言',
    searchPlaceholder: '按标题搜索',
    searchLoading: '搜索中…',
    loadFailedReload: '加载失败，请重新加载页面。',
    searchEmpty: '没有符合的文章。',
    tagsHeading: '标签',
    tagPageTitle: '标签：{tag}',
    tagEmpty: '这个标签还没有文章。',
    tocHeading: '目录',
    prevArticle: '上一篇文章',
    nextArticle: '下一篇文章',
    prevArticleWithTitle: '上一篇文章：{title}',
    nextArticleWithTitle: '下一篇文章：{title}',
    shareHeading: '分享这篇文章',
    copyLink: '复制链接',
    copied: '已复制',
    copy: '复制',
    copyDone: '已复制',
    loading: '加载中...',
    backToLatest: '返回最新文章',
    loadFailed: '加载失败。',
    latestNotFound: '未找到最新文章。',
    articleFetchFailed: '获取文章失败。',
    articleListFetchFailed: '获取文章列表失败。',
    articleTitlesFetchFailed: '获取文章标题列表失败。',
    rssFetchFailed: '获取 RSS 失败。',
    footerSite: '本站',
    footerSns: 'SNS',
    footerReviews: '点评',
    footerProfile: '简介及其他',
    footerTools: '我的工具',
    footerBelongings: '随身物品',
    footerBucketList: '愿望清单',
    footerGoogleReviews: 'Google 地图点评',
    footerRakutenReviews: '乐天旅游点评',
    footerTabelogReviews: 'Tabelog 点评',
    footerRettyReviews: 'Retty 点评',
    toolXuexi: '学习（中文复习）',
    toolMd2img: 'md2img（Markdown to Image）',
    toolPortfolio: 'portfolio-treemap（投资组合构成图）',
    toolDtgwt: 'dtgwt（决策表→Given/When/Then）',
    toolQict: 'node-qict（成对测试用例生成）',
    toolSmtc: 'smtc（状态迁移测试用例生成）',
    toolDtdt: 'dtdt（决策树→决策表）',
    playerPrev: '上一首',
    playerNext: '下一首',
    playerPlay: '播放',
    playerPause: '暂停',
    playerLoading: '加载中',
    playerSeek: '播放位置',
    repeatNone: '循环：关',
    repeatAll: '循环：全部',
    repeatOne: '单曲循环',
    shuffleOn: '随机：开',
    shuffleOff: '随机：关',
    playerLoadError: '无法加载音频。',
    lyricsLabel: '歌词',
    itemLink: '此条目的链接'
  }
};

export const isSupportedLang = (value) => SUPPORTED_LANGS.includes(value);

// Maps browser language tags (navigator.languages) to a supported
// language: any en-* tag means English, any zh-* tag means Chinese
// (the dictionary is Simplified, whatever the region). The first
// tag that maps wins; tags for other languages are skipped, and a
// list with no mappable tag yields null.
export const detectBrowserLang = (languages = []) => {
  for (const tag of languages ?? []) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (primary === 'en') return 'en';
    if (primary === 'zh') return 'zh';
  }
  return null;
};

// Resolution order: the persisted choice, then the browser's
// language, then Japanese. Invalid values are ignored at each
// step.
export const resolveInitialLang = ({ stored = null, browser = null } = {}) => {
  if (isSupportedLang(stored)) return stored;
  if (isSupportedLang(browser)) return browser;
  return DEFAULT_LANG;
};

const readStoredLang = () => {
  try {
    return (
      localStorage.getItem(LANGUAGE_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY)
    );
  } catch {
    return null;
  }
};

const readBrowserLang = () => {
  try {
    const languages = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    return detectBrowserLang(languages);
  } catch {
    return null;
  }
};

const persistLang = (lang) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage failures (quota, private mode) only lose the
    // preference for the next visit; the switch itself still works.
  }
};

const applyHtmlLang = (lang) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = HTML_LANG[lang] ?? lang;
  }
};

export const currentLang = ref(DEFAULT_LANG);

// The language a viewer resolves to away from the URL, from the
// same inputs in the same order everywhere: the persisted
// switcher choice, the browser's language, Japanese last.
// initLang resolves this once at startup; the router resolves
// it for every language-less URL and sends an English or
// Chinese viewer to the prefixed URL instead (see router.js),
// so the URL stays the single source of truth for language.
export const resolveViewerLang = () =>
  resolveInitialLang({
    stored: readStoredLang(),
    browser: readBrowserLang()
  });

// Resolves the language once at startup (called from main.js
// before the app mounts). The stored switcher choice wins over
// the browser's language. A language taken from the browser's
// settings is applied but NOT persisted, so detection runs
// again on the next visit until the reader picks a language in
// the switcher (which setLang persists).
export const initLang = () => {
  const lang = resolveViewerLang();
  currentLang.value = lang;
  applyHtmlLang(lang);
  return lang;
};

export const setLang = (lang) => {
  if (!isSupportedLang(lang)) return;
  currentLang.value = lang;
  persistLang(lang);
  applyHtmlLang(lang);
};

// The language named by the URL prefix (/blog/en/…, /blog/zh/…), or
// null on Japanese URLs, which carry no prefix. While a route
// language is set it decides BOTH the article language and the UI
// language: the URL is the reader's explicit choice, so it outranks
// the stored preference and the browser detection below. A
// language-less URL is only ever reached by a viewer who resolves
// to Japanese — the router replaces it with the prefixed URL for
// everyone else — so Japanese URLs always mean Japanese UI and
// Japanese articles too.
export const routeLang = ref(null);

// The language article content is fetched and cached in: the route
// language on translated pages, Japanese everywhere else.
export const contentLang = computed(() => routeLang.value ?? DEFAULT_LANG);

// Applies the language a route names (called by the router on every
// navigation that is not redirected first). Entering a translated
// route forces the UI language to the route's, WITHOUT persisting
// it — the stored preference stays what the reader last picked in
// the switcher. Leaving the translated routes re-resolves the UI
// language (stored choice, browser): in-app that only
// happens once the viewer resolves to Japanese (the router has
// already redirected everyone else, and the switcher persists its
// Japanese choice before navigating out), so the re-resolution
// lands on Japanese and a preference saved by the switcher on the
// way out takes effect. Japanese-to-Japanese navigations change
// nothing: the current state stands.
export const applyRouteLang = (lang) => {
  if (isSupportedLang(lang) && lang !== DEFAULT_LANG) {
    routeLang.value = lang;
    currentLang.value = lang;
    applyHtmlLang(lang);
    return lang;
  }
  const wasRouted = routeLang.value !== null;
  routeLang.value = null;
  if (!wasRouted) {
    return currentLang.value;
  }
  const resolved = resolveInitialLang({
    stored: readStoredLang(),
    browser: readBrowserLang()
  });
  currentLang.value = resolved;
  applyHtmlLang(resolved);
  return resolved;
};

// Swaps the language prefix of an in-app path: Japanese paths carry
// no prefix, translated ones carry /en or /zh, and the rest of the
// path (root, article id, tag page) is preserved. The language
// switcher uses it to send the reader to the same page in another
// language.
export const localizedPath = (path, lang) => {
  const stripped = String(path || '/').replace(/^\/(en|zh)(?=\/|$)/, '') || '/';
  if (!isSupportedLang(lang) || lang === DEFAULT_LANG) {
    return stripped;
  }
  return stripped === '/' ? `/${lang}` : `/${lang}${stripped}`;
};

// Display labels for the tag names. The tags themselves are
// Japanese strings end to end — blog-gas sends them, and they key
// the routes and the caches — so only what the reader sees is
// translated, through this fixed mapping. A tag missing from the
// map, and Japanese UI altogether, shows the raw name.
export const TAG_LABELS = {
  en: {
    運営: 'Site operations',
    技術: 'Tech',
    中国語: 'Chinese',
    音楽: 'Music',
    川口: 'Kawaguchi',
    暮らし: 'Daily life'
  },
  zh: {
    運営: '网站运营',
    技術: '技术',
    中国語: '中文',
    音楽: '音乐',
    川口: '川口',
    暮らし: '生活'
  }
};

export const tagLabel = (tag) => TAG_LABELS[currentLang.value]?.[tag] ?? tag;

// Absolute URLs of the top page and the blog home, following the
// UI language: the top page has real /en/ and /zh/ pages and the
// blog's home is its language root, so a reader browsing in
// English who follows a "top" link lands on the English top page
// instead of the Japanese one. Japanese (and anything unknown)
// keeps the plain URLs, byte-identical to before. An anchor
// rides along after the language segment (…/en/#about).
export const SITE_ORIGIN = 'https://freddiefujiwara.com';

const langSegment = (lang) =>
  (isSupportedLang(lang) && lang !== DEFAULT_LANG ? `/${lang}` : '');

export const topPageUrl = (lang, anchor = '') =>
  `${SITE_ORIGIN}${langSegment(lang)}/${anchor}`;

export const blogHomeUrl = (lang) =>
  `${SITE_ORIGIN}/blog${langSegment(lang)}/`;

// Translates one UI string. {name} placeholders are filled from
// params; a placeholder without a matching param is left as-is.
// Unknown keys fall back to the Japanese text, then to the key
// itself, so a missing entry degrades instead of breaking.
export const t = (key, params = {}) => {
  const text = MESSAGES[currentLang.value]?.[key] ?? MESSAGES[DEFAULT_LANG][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    (name in params ? String(params[name]) : match));
};
