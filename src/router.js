import { createRouter, createWebHistory } from 'vue-router'
import BlogView from './pages/BlogView.vue'
import TagView from './pages/TagView.vue'
import {
  DEFAULT_LANG,
  applyRouteLang,
  localizedPath,
  resolveViewerLang
} from './services/i18n'

const BASE = import.meta.env.BASE_URL

// One mechanism carries the language: an optional :lang segment
// (en|zh) in front of the Japanese routes. Japanese URLs keep their
// existing shape with no prefix; translated pages live under
// /en/… and /zh/…. The lang-home record exists because a bare /en
// would otherwise match the article route with id "en".
const router = createRouter({
  history: createWebHistory(BASE),
  routes: [
    { path: '/', name: 'home', component: BlogView },
    { path: '/:lang(en|zh)', name: 'lang-home', component: BlogView },
    // Registered before the article routes so "tag" is not read as an article id.
    { path: '/:lang(en|zh)?/tag/:tag', name: 'tag', component: TagView, props: true },
    { path: '/:lang(en|zh)?/:id', name: 'post', component: BlogView, props: true },
  ],
})

// The URL is the single source of truth for language. A
// language-less URL whose viewer resolves to English or Chinese —
// the stored switcher choice, then the browser's language, in
// the order initLang uses — is replaced by the same page under
// that language's prefix, so a translated UI can never sit on a
// Japanese URL. The redirect cannot loop: its target always
// carries a language, prefixed routes never redirect, and a
// Japanese resolution stays where it is. The query (e.g. the
// legacy ?id=) and the hash ride along.
router.beforeEach((to) => {
  if (!to.params.lang) {
    const viewer = resolveViewerLang()
    if (viewer !== DEFAULT_LANG) {
      return {
        path: localizedPath(to.path, viewer),
        query: to.query,
        hash: to.hash,
        replace: true
      }
    }
  }
  // The route language drives both the article language and the
  // UI language (services/i18n). Applied before each navigation
  // that is not redirected, so the views already render in the
  // route's language.
  applyRouteLang(to.params.lang)
})

export default router
