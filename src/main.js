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
  const banner = showStagingBanner();
  // The banner sits in the page flow at the very top, where the
  // fixed nav would cover it. Keep it visible: style.css sticks
  // the banner to the top and drops the nav below it by the
  // banner's measured height, published here as a custom property
  // (the banner wraps to more lines on narrow screens, so the
  // height is re-measured on resize and once everything loaded).
  banner.classList.add('staging-banner');
  const root = document.documentElement;
  root.classList.add('has-staging-banner');
  const syncBannerHeight = () => {
    root.style.setProperty('--staging-banner-height', `${banner.offsetHeight}px`);
  };
  syncBannerHeight();
  window.addEventListener('resize', syncBannerHeight);
  window.addEventListener('load', syncBannerHeight);
}
initWebVitals();
