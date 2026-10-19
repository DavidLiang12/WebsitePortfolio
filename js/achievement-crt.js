(() => {
  'use strict';
  if (!document.querySelector('.achievement-pc-page')) return;
  const groups = {
    art: '.achievement-poster-art, .achievement-poster-pixels',
    type: '.achievement-copy, .achievement-status, .achievement-summary-copy, .achievement-progress, .achievement-filters button, .achievement-badge > svg, .achievement-badge-pixels, .achievement-credit, .achievement-taskbar .sound-toggle-classic, .achievement-boot-type, .achievement-boot-track, #achievement-skip-boot',
    motion: '.achievement-globe'
  };
  const seen = new Set();
  let departing = false;
  // Prewarm just outside the viewport. Offscreen rows do not allocate large
  // filter surfaces; the sphere's cheaper RGB pass is clipped to its window.
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (departing) return;
    entries.forEach(entry => entry.target.classList.toggle('achievement-crt-sleeping', !entry.isIntersecting));
    window.dispatchEvent(new Event('portfolio:achievementvisibility'));
  }, { rootMargin: '160px' }) : null;
  function attach() {
    if (departing) return;
    for (const element of seen) {
      if (!element.isConnected) { observer?.unobserve(element); seen.delete(element); }
    }
    for (const [kind, selector] of Object.entries(groups)) {
      document.querySelectorAll(selector).forEach(element => {
        element.classList.add(`achievement-crt-${kind}`);
        if (!seen.has(element)) {
          seen.add(element);
          if (observer) element.classList.add('achievement-crt-sleeping');
          observer?.observe(element);
        }
      });
    }
  }
  const sync = () => document.body.classList.toggle('achievement-crt-paused', departing || document.hidden);
  function suspend() { departing = true; observer?.disconnect(); sync(); }
  function resume() {
    const wasDeparting = departing;
    departing = false;
    attach();
    if (wasDeparting) seen.forEach(element => observer?.observe(element));
    sync();
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('portfolio:transitionstart', suspend);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('portfolio:transitionend', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('portfolio:achievements', attach);
  window.addEventListener('portfolio:achievementpixels', attach);
  document.addEventListener('DOMContentLoaded', attach, { once: true });
  // Filtering replaces rows; observe that small list rather than the animated
  // sphere or document, and retain native text, controls and focus throughout.
  const list = document.getElementById('achievement-list');
  if (list) new MutationObserver(attach).observe(list, { childList: true });
  attach(); sync();
})();
