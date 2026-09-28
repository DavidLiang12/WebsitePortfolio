(() => {
  'use strict';
  const boot = document.getElementById('desktop-boot');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!boot) return;

  const content = [...boot.parentElement.children].filter(element => element !== boot);
  let previousFocus;
  const timers = [];
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    const restoreFocus = boot.contains(document.activeElement);
    boot.hidden = true;
    content.forEach(element => { element.inert = false; });
    if (restoreFocus) (previousFocus === document.body ? document.querySelector('[data-open]') : previousFocus)?.focus({ preventScroll: true });
  }
  const status = document.getElementById('boot-status');
  function start() {
    timers.forEach(clearTimeout);
    timers.length = 0;
    finished = false;
    previousFocus = document.activeElement;
    status.textContent = 'Starting art desk…';
    boot.hidden = false;
    content.forEach(element => { element.inert = true; });
    // Reduced motion still gets a brief, static loading scene on every entry.
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
