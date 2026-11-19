import { createRouter, createWebHistory } from 'vue-router'
import BlogView from './pages/BlogView.vue'
import TagView from './pages/TagView.vue'
import { applyRouteLang } from './services/i18n'

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

// The URL language drives both the article language and the UI
// language (services/i18n). Applied before each navigation so the
// views already render in the route's language.
router.beforeEach((to) => {
  applyRouteLang(to.params.lang)
})

export default router
