(() => {
  'use strict';
  const boot = document.getElementById('achievement-boot');
  if (!boot) return;
  const screen = document.querySelector('.achievement-display') || document.querySelector('.achievement-screen');
  const header = document.querySelector('.portfolio-header');
  const poster = document.querySelector('.achievement-poster');
  const content = [screen, ...document.querySelectorAll('.skip-link')];
  const status = document.getElementById('achievement-boot-status');
  const bootLines = [...boot.querySelectorAll('[data-boot-line]')];
  const enabled = matchMedia('(min-width: 641px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = [];
  let previousFocus;
  let finished = true;
  let played = false;

  function fitBootNav() {
    if (!boot.hidden && header) {
      const height = `${Math.ceil(header.getBoundingClientRect().height)}px`;
      boot.style.top = height;
      // The fixed navbar keeps its place in the underlying document flow.
      screen.style.paddingTop = height;
    }
  }

  function fitPosterNumber() {
    const number = document.getElementById('achievement-poster-number');
    const type = document.getElementById('achievement-poster-number-type');
    const title = document.getElementById('achievement-poster-title-type');
    const stripes = document.getElementById('achievement-poster-stripes');
    if (!number || !type || !title || !stripes) return;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const measure = element => {
      const style = getComputedStyle(element);
      context.font = style.font;
      context.letterSpacing = style.letterSpacing;
      return context.measureText(element.textContent);
    };
    const bounds = measure(type);
    const height = bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent;
    if (!height) return;
    // Match the visible ink to the thicker stripes and the title's final S.
    const stripeTop = 18, stripeHeight = 112;
    const scale = stripeHeight / height;
    const titleRight = measure(title).actualBoundingBoxRight;
    // The lower line projects to the right on the diagonal. Inset its end so
    // the visible 1 finishes beneath the S, rather than beyond it.
    const right = titleRight - 60;
    const x = right - bounds.actualBoundingBoxRight * scale;
    const left = x - bounds.actualBoundingBoxLeft * scale;
    const transform = `translate(${x} ${stripeTop + bounds.actualBoundingBoxAscent * scale}) scale(${scale})`;
    number.setAttribute('transform', transform);
    document.getElementById('achievement-poster-clearance')?.setAttribute('transform', transform);
    stripes.querySelectorAll('path').forEach((path, index) => {
      const top = stripeTop + index * stripeHeight / 4;
      path.setAttribute('d', `M-600 ${top}H${left + 22}V${top + stripeHeight / 4}H-600Z`);
    });
    document.getElementById('achievement-poster-date-art')?.setAttribute('x', titleRight - 66);
  }

  function updatePosterDate() {
    const date = document.getElementById('achievement-poster-date');
    const artworkDate = document.getElementById('achievement-poster-date-art');
    if (!date || !artworkDate) return;
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth() + 1, day = now.getDate();
    const label = `${year}年${month}月${day}日`;
    date.dateTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    date.textContent = label;
    artworkDate.textContent = label;
  }

  function finish(skipped = false) {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    timers.length = 0;
    const restoreFocus = boot.contains(document.activeElement);
    boot.hidden = true;
    document.body.classList.remove('achievement-starting');
    screen.style.paddingTop = '';
    content.forEach(element => { element.inert = false; });
    window.portfolioSound?.finishAchievementBoot?.(skipped);
    window.dispatchEvent(new Event('portfolio:achievementboot'));
    if (restoreFocus) (previousFocus && previousFocus !== document.body ? previousFocus : screen)?.focus({ preventScroll: true });
  }
  function start() {
    finish();
    updatePosterDate();
    if (!enabled.matches || played) return;
    // Tab-session storage survives navigation and reloads, then expires when
    // the visitor closes the tab. Each desktop has its own first entry.
    try {
      if (sessionStorage.getItem('portfolio-achievement-startup-v1') === '1') { played = true; return; }
      sessionStorage.setItem('portfolio-achievement-startup-v1', '1');
    } catch (_) { /* The in-memory flag still handles cached returns. */ }
    played = true;
    previousFocus = document.activeElement;
    finished = false;
    bootLines.forEach((line, index) => { line.hidden = index > 0; });
    status.textContent = 'Checking memory…';
    boot.hidden = false;
    document.body.classList.add('achievement-starting');
    fitBootNav();
    content.forEach(element => { element.inert = true; });
    boot.focus({ preventScroll: true });
    window.portfolioSound?.startAchievementBoot?.();
    window.dispatchEvent(new Event('portfolio:achievementboot'));
    if (!motion.matches) {
      const stages = [
        [300, 'Initializing color display…'],
        [650, 'Connecting project archive…'],
        [1000, 'Mounting achievement drive…'],
        [1400, 'Reading visitor progress…'],
        [1850, 'Starting ACHIEVEMENTS.EXE…']
      ];
      stages.forEach(([delay, label], index) => {
        timers.push(setTimeout(() => {
          if (bootLines[index + 1]) bootLines[index + 1].hidden = false;
          status.textContent = label;
        }, delay));
      });
    }
    timers.push(setTimeout(finish, motion.matches ? 350 : 2400));
  }
  document.getElementById('achievement-skip-boot').addEventListener('click', () => finish(true));
  boot.addEventListener('keydown', event => { if (event.key === 'Escape') finish(true); });
  enabled.addEventListener('change', start);
  window.addEventListener('resize', fitBootNav);
  motion.addEventListener('change', event => { if (event.matches) finish(true); });
  window.addEventListener('pagehide', () => finish(true));
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });

  function setupSound() {
    const sound = document.querySelector('.achievements-main > .sound-controls');
    if (sound) document.getElementById('achievement-sound-slot').append(sound);
  }
  // Deferred scripts can run while readyState is interactive, before sound.js
  // creates its control at DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', setupSound, { once: true });
  setupSound();
  // Never fit the diagonal artwork using a temporary fallback font. Its first
  // visible frame is the finished low-resolution canvas, not the placeholder SVG.
  const posterFonts = document.fonts?.load
    ? Promise.allSettled([document.fonts.load('italic 800 190px "Barlow Condensed"'), document.fonts.load('400 20px "IBM Plex Mono"')])
    : (document.fonts?.ready || Promise.resolve());
  const preparePoster = () => {
    fitPosterNumber();
    fitBootNav();
    if (poster) {
      poster.classList.add('is-poster-fitted');
      window.dispatchEvent(new Event('portfolio:achievementposterready'));
    }
  };
  posterFonts.then(preparePoster, preparePoster);
  start();
})();
