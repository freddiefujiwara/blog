import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { trackPageView } from './analytics';
import { initLang } from './services/i18n';
import { initWebVitals } from './web-vitals';
import './style.css';
import { isStagingBuild, showStagingBanner } from './staging-banner.js';

router.afterEach((to) => {
  trackPageView(to.fullPath);
});

initLang();
createApp(App).use(router).mount('#app');
if (isStagingBuild()) {
  showStagingBanner();
}
initWebVitals();
