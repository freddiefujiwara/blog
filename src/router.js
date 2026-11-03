import { createRouter, createWebHistory } from 'vue-router'
import BlogView from './pages/BlogView.vue'

const BASE = import.meta.env.BASE_URL

const router = createRouter({
  history: createWebHistory(BASE),
  routes: [
    { path: '/', component: BlogView },
    { path: '/:id', name: 'post', component: BlogView, props: true },
  ],
})

export default router
