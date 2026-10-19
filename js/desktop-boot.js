(() => {
  'use strict';
  const boot = document.getElementById('desktop-boot');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!boot) return;

  const content = [...boot.parentElement.children].filter(element => element !== boot);
  let previousFocus;
  const timers = [];
  let finished = true;
  let played = false;
  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    timers.length = 0;
    const restoreFocus = boot.contains(document.activeElement);
    boot.hidden = true;
    window.dispatchEvent?.(new Event('portfolio:desktopboot'));
    content.forEach(element => { element.inert = false; });
    if (restoreFocus) (previousFocus === document.body ? document.querySelector('[data-open]') : previousFocus)?.focus({ preventScroll: true });
  }
  const status = document.getElementById('boot-status');
  function start() {
    finish();
    if (played) return;
    try {
      if (sessionStorage.getItem('portfolio-art-startup-v1') === '1') { played = true; return; }
      sessionStorage.setItem('portfolio-art-startup-v1', '1');
    } catch (_) { /* Cached returns can still use the in-memory flag. */ }
    played = true;
    finished = false;
    previousFocus = document.activeElement;
    status.textContent = 'Starting art desk…';
    boot.hidden = false;
    content.forEach(element => { element.inert = true; });
    boot.focus({ preventScroll: true });
    // Reduced motion keeps the first-entry scene brief and static.
    if (!motion.matches) {
      timers.push(setTimeout(() => { status.textContent = 'Loading artwork… OK'; }, 500));
      timers.push(setTimeout(() => { status.textContent = 'Opening your desktop…'; }, 1250));
    }
    timers.push(setTimeout(finish, motion.matches ? 450 : 2100));
  }
  start();
  document.getElementById('skip-boot').addEventListener('click', finish);
  boot.addEventListener('keydown', event => { if (event.key === 'Escape') finish(); });
  motion.addEventListener('change', event => { if (event.matches) finish(); });
  window.addEventListener('pagehide', finish);
  window.addEventListener('pageshow', event => { if (event.persisted) start(); });
})();
