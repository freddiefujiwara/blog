import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { trackPageView } from './analytics';
import './style.css';
import { showStagingBanner } from './staging-banner.js';

router.afterEach((to) => {
  trackPageView(to.fullPath);
});

createApp(App).use(router).mount('#app');
showStagingBanner();
