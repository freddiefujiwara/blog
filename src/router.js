import { createRouter, createWebHistory } from 'vue-router'
import BlogView from './pages/BlogView.vue'
import TagView from './pages/TagView.vue'

const BASE = import.meta.env.BASE_URL

const router = createRouter({
  history: createWebHistory(BASE),
  routes: [
    { path: '/', component: BlogView },
    // Registered before /:id so "tag" is not read as an article id.
    { path: '/tag/:tag', name: 'tag', component: TagView, props: true },
    { path: '/:id', name: 'post', component: BlogView, props: true },
  ],
})

export default router
