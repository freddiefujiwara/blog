import { createRouter, createWebHistory } from 'vue-router'
import BlogView from './pages/BlogView.vue'

const BASE = '/blog/'

const router = createRouter({
  history: createWebHistory(BASE),
  routes: [
    { path: '/', component: BlogView },
    { path: '/:id', name: 'post', component: BlogView, props: true },
  ],
})

export default router
