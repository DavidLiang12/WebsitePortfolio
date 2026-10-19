(() => {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const model = window.AchievementState;
  const enabled = matchMedia('(min-width: 641px)');
  const url = new URL(location.href);
  const path = url.pathname.startsWith(root.pathname) ? url.pathname.slice(root.pathname.length) || 'index.html' : '';
  let state = model.normalize(null), storageAvailable = true, departing = false, frame = 0, scrolled = false;
  function read() {
    try { return model.normalize(JSON.parse(localStorage.getItem(model.storageKey))); }
    catch (_) { storageAvailable = false; return state; }
  }
  function updateHeader() {
    const header = document.querySelector('.portfolio-header-inner');
    const logo = header?.querySelector('.portfolio-logo');
    if (!header || !logo) return;
    let link = header.querySelector('.header-achievements');
    if (!enabled.matches || !state.visited.length) {
      link?.remove(); header.classList.remove('has-achievements'); return;
    }
    if (!link) {
      let brand = header.querySelector('.portfolio-brand');
      if (!brand) { brand = document.createElement('div'); brand.className = 'portfolio-brand'; logo.before(brand); brand.append(logo); }
      link = document.createElement('a'); link.className = 'header-achievements';
      link.href = new URL('achievements.html', root).href;
      link.innerHTML = '<span>Achievements</span><span class="header-achievement-count"></span>';
      brand.append(link);
    }
    header.classList.add('has-achievements');
    link.querySelector('.header-achievement-count').textContent = `${model.achievements.filter(item => item.earned(state)).length}/${model.achievements.length}`;
    if (path === 'achievements.html') link.setAttribute('aria-current', 'page');
  }
  function publish() { updateHeader(); window.dispatchEvent(new CustomEvent('portfolio:achievements')); }
  function commit(change, force = false) {
    if (!enabled.matches) return;
    const previous = read();
    state = change(previous);
    const changed = JSON.stringify(state) !== JSON.stringify(previous);
    if (changed) {
      try { localStorage.setItem(model.storageKey, JSON.stringify(state)); }
      catch (_) { storageAvailable = false; }
    }
    window.portfolioAchievementNotifications.initialize(state);
    window.portfolioAchievementNotifications.enqueue(model.newlyEarned(previous, state));
    if (changed || force) publish();
  }
  function checkBottom() {
    frame = 0;
    if (!enabled.matches || departing || document.hidden || (document.readyState !== 'complete' && !scrolled)) return;
    if (['desktop-boot', 'achievement-boot'].some(id => document.getElementById?.(id)?.hidden === false)) return;
    if (!model.completionTargets.includes(path) || state.completed.includes(path)) return;
    const scrolling = document.scrollingElement || document.documentElement;
    if (scrolling && window.scrollY + window.innerHeight >= scrolling.scrollHeight - 8) commit(previous => model.complete(previous, path));
  }
  function requestBottom() {
    if (enabled.matches && !departing && !frame) frame = requestAnimationFrame(checkBottom);
  }
  function start() {
    departing = false;
    if (!enabled.matches) { publish(); return; }
    commit(previous => model.enter(previous, path), true);
    requestBottom();
  }
  const on2D = change => { if (path === 'art-2d.html') commit(change); };
  window.portfolioAchievements = {
    getState: () => model.normalize(state),
    get available() { return enabled.matches; },
    get storageAvailable() { return storageAvailable; },
    open2D(id) {
      on2D(previous => id === 'my-cat' ? model.act(previous, 'cat') : model.visit(previous, `art-2d.html#${id}`));
    },
    complete2D(id) { on2D(previous => model.complete(previous, `art-2d.html#${id}`)); },
    savePainting() { on2D(previous => model.act(previous, 'paint-saved')); }
  };
  enabled.addEventListener('change', start);
  window.addEventListener('pageshow', start);
  window.addEventListener('load', requestBottom);
  window.addEventListener('scroll', () => { scrolled = true; requestBottom(); }, { passive: true });
  window.addEventListener('resize', requestBottom);
  window.addEventListener('portfolio:desktopboot', requestBottom);
  window.addEventListener('portfolio:achievementboot', requestBottom);
  window.addEventListener('portfolio:transitionstart', () => { departing = true; cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('portfolio:transitionend', () => { departing = false; requestBottom(); });
  window.addEventListener('pagehide', () => { departing = true; cancelAnimationFrame(frame); frame = 0; });
  document.addEventListener('visibilitychange', requestBottom);
  if ('ResizeObserver' in window) new ResizeObserver(requestBottom).observe(document.body);
  window.addEventListener('storage', event => {
    if (enabled.matches && (event.key === model.storageKey || event.key === null)) { state = read(); publish(); }
  });
  start();
})();
